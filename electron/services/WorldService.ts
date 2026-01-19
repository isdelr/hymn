import fs from 'node:fs/promises'
import path from 'node:path'
import { pathExists, readJsonFile } from '../utils/fileSystem'
import { isWithinPath } from '../utils/security'
import { readSetting, writeSetting, SETTINGS_KEYS } from '../core/database'
import { resolveInstallInfo } from './InstallService'
import type {
  WorldInfo,
  WorldConfig,
  WorldsState,
  SetModEnabledOptions,
  SetModEnabledResult,
  ModEntry,
} from '../../src/shared/hymn-types'

/**
 * Get all world config paths from the Saves folder.
 */
export async function getWorldConfigPaths(userDataPath: string | null): Promise<string[]> {
  if (!userDataPath) return []
  const savesRoot = path.join(userDataPath, 'Saves')
  if (!(await pathExists(savesRoot))) {
    return []
  }
  const entries = await fs.readdir(savesRoot, { withFileTypes: true })
  const configs: string[] = []

  for (const entry of entries) {
    if (!entry.isDirectory()) continue
    const configPath = path.join(savesRoot, entry.name, 'config.json')
    if (await pathExists(configPath)) {
      configs.push(configPath)
    }
  }

  return configs
}

/**
 * Get the active world config path (most recently modified).
 */
export async function getActiveWorldConfigPath(userDataPath: string | null): Promise<string | null> {
  const configs = await getWorldConfigPaths(userDataPath)
  let latest: { path: string; mtimeMs: number } | null = null

  for (const configPath of configs) {
    const stat = await fs.stat(configPath)
    if (!latest || stat.mtimeMs > latest.mtimeMs) {
      latest = { path: configPath, mtimeMs: stat.mtimeMs }
    }
  }

  return latest?.path ?? null
}

/**
 * Read mod override settings from a world config.
 */
export function readWorldModOverridesFromConfig(config: Record<string, unknown>): Map<string, boolean> {
  const overrides = new Map<string, boolean>()
  const modsValue = config.Mods
  if (!modsValue || typeof modsValue !== 'object') {
    return overrides
  }

  for (const [modId, value] of Object.entries(modsValue as Record<string, unknown>)) {
    if (!value || typeof value !== 'object') continue
    const enabledValue = (value as Record<string, unknown>).Enabled
    if (typeof enabledValue === 'boolean') {
      overrides.set(modId, enabledValue)
    }
  }

  return overrides
}

/**
 * Read mod overrides from the active world.
 */
export async function readActiveWorldModOverrides(userDataPath: string | null): Promise<Map<string, boolean> | null> {
  const configPath = await getActiveWorldConfigPath(userDataPath)
  if (!configPath) return null
  try {
    const config = await readJsonFile(configPath)
    return readWorldModOverridesFromConfig(config)
  } catch {
    return null
  }
}

/**
 * Update mod config in a world's config.json.
 */
export async function updateWorldModConfig(
  configPath: string,
  enabledSet: Set<string>,
  entries: ModEntry[]
): Promise<void> {
  let config: Record<string, unknown>
  try {
    config = await readJsonFile(configPath)
  } catch {
    config = {}
  }

  const existingMods = config.Mods
  const modsSection: Record<string, unknown> =
    existingMods && typeof existingMods === 'object' ? { ...(existingMods as Record<string, unknown>) } : {}

  for (const entry of entries) {
    const existingEntry = modsSection[entry.id]
    const nextEntry: Record<string, unknown> =
      existingEntry && typeof existingEntry === 'object' ? { ...(existingEntry as Record<string, unknown>) } : {}
    nextEntry.Enabled = enabledSet.has(entry.id)
    modsSection[entry.id] = nextEntry
  }

  config.Mods = modsSection
  await fs.writeFile(configPath, JSON.stringify(config, null, 2), 'utf-8')
}

/**
 * Sync mod config to the active world.
 */
export async function syncActiveWorldModConfig(
  userDataPath: string | null,
  enabledSet: Set<string>,
  entries: ModEntry[]
): Promise<void> {
  const configPath = await getActiveWorldConfigPath(userDataPath)
  if (!configPath) return
  try {
    await updateWorldModConfig(configPath, enabledSet, entries)
  } catch {
    // Failed to sync mod settings
  }
}

/**
 * Get all worlds.
 */
export async function getWorlds(): Promise<WorldsState> {
  const info = await resolveInstallInfo()
  if (!info.userDataPath) {
    return { worlds: [], selectedWorldId: null }
  }

  const savesPath = path.join(info.userDataPath, 'Saves')
  if (!(await pathExists(savesPath))) {
    return { worlds: [], selectedWorldId: null }
  }

  const entries = await fs.readdir(savesPath, { withFileTypes: true })
  const worlds: WorldInfo[] = []

  for (const entry of entries) {
    if (!entry.isDirectory()) continue
    const worldPath = path.join(savesPath, entry.name)
    const configPath = path.join(worldPath, 'config.json')
    const previewPath = path.join(worldPath, 'preview.png')

    if (!(await pathExists(configPath))) continue // Only include valid worlds

    const stat = await fs.stat(worldPath)
    let previewDataUrl: string | null = null

    if (await pathExists(previewPath)) {
      try {
        const previewBuffer = await fs.readFile(previewPath)
        previewDataUrl = `data:image/png;base64,${previewBuffer.toString('base64')}`
      } catch {
        // Ignore preview read errors
      }
    }

    worlds.push({
      id: entry.name,
      name: entry.name,
      path: worldPath,
      configPath,
      previewPath: (await pathExists(previewPath)) ? previewPath : null,
      previewDataUrl,
      lastModified: stat.mtime.toISOString(),
    })
  }

  // Sort by last modified (most recent first)
  worlds.sort((a, b) => b.lastModified.localeCompare(a.lastModified))

  // Get persisted selected world or default to most recent
  const selectedWorldId = (await readSetting(SETTINGS_KEYS.selectedWorld)) ?? (worlds.length > 0 ? worlds[0].id : null)

  return { worlds, selectedWorldId }
}

/**
 * Get a specific world's config.
 */
export async function getWorldConfig(worldId: string): Promise<WorldConfig | null> {
  const info = await resolveInstallInfo()
  if (!info.userDataPath) return null

  const configPath = path.join(info.userDataPath, 'Saves', worldId, 'config.json')

  // Safety: Verify path is within expected location
  const savesRoot = path.join(info.userDataPath, 'Saves')
  if (!isWithinPath(configPath, savesRoot)) {
    throw new Error('Invalid world path detected.')
  }

  if (!(await pathExists(configPath))) return null

  try {
    const content = await fs.readFile(configPath, 'utf-8')
    return JSON.parse(content) as WorldConfig
  } catch {
    return null
  }
}

/**
 * Set a mod's enabled state in a world.
 */
export async function setModEnabled(options: SetModEnabledOptions): Promise<SetModEnabledResult> {
  const info = await resolveInstallInfo()

  if (!info.userDataPath) {
    throw new Error('Hytale UserData path not found.')
  }

  const configPath = path.join(info.userDataPath, 'Saves', options.worldId, 'config.json')

  // Safety: Verify path is within expected location
  const savesRoot = path.join(info.userDataPath, 'Saves')
  if (!isWithinPath(configPath, savesRoot)) {
    throw new Error('Invalid world path detected.')
  }

  if (!(await pathExists(configPath))) {
    throw new Error('World config.json not found.')
  }

  let config: WorldConfig = {}
  try {
    const content = await fs.readFile(configPath, 'utf-8')
    config = JSON.parse(content) as WorldConfig
  } catch {
    // Could not read existing config, creating new Mods section
  }

  // Initialize Mods section if needed
  if (!config.Mods || typeof config.Mods !== 'object') {
    config.Mods = {}
  }

  // Initialize mod entry if needed
  if (!config.Mods[options.modId] || typeof config.Mods[options.modId] !== 'object') {
    config.Mods[options.modId] = { Enabled: options.enabled }
  } else {
    config.Mods[options.modId].Enabled = options.enabled
  }

  // Write back to file
  await fs.writeFile(configPath, JSON.stringify(config, null, 2), 'utf-8')

  return { success: true }
}

/**
 * Set the selected world.
 */
export async function setSelectedWorld(worldId: string): Promise<void> {
  await writeSetting(SETTINGS_KEYS.selectedWorld, worldId)
}
