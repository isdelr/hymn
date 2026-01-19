import fs from 'node:fs/promises'
import path from 'node:path'
import JSZip from 'jszip'
import { pathExists, getPathSize, ensureDir, copyPath, removePath, movePath, readJsonFile } from '../utils/fileSystem'
import { isWithinPath } from '../utils/security'
import { getDisabledRoot, getDeletedModsRoot } from '../core/paths'
import { resolveInstallInfo, getLocationPath } from './InstallService'
import { seedProfilesFromScan, syncDefaultProfileFromScan, getProfilesFromDatabase } from './ProfileService'
import { getWorldConfig, readActiveWorldModOverrides, syncActiveWorldModConfig } from './WorldService'
import type {
  ModEntry,
  ModFormat,
  ModLocation,
  ModType,
  ScanResult,
  DeleteModOptions,
  DeleteModResult,
  AddModResult,
  DependencyIssue,
  ModValidationResult,
  ApplyResult,
} from '../../src/shared/hymn-types'
import { dialog } from 'electron'

/**
 * Read manifest from a mod folder.
 */
export async function readManifestFromFolder(folderPath: string): Promise<Record<string, unknown> | null> {
  const rootManifest = path.join(folderPath, 'manifest.json')
  const serverManifest = path.join(folderPath, 'Server', 'manifest.json')
  // Plugin projects store manifest in src/main/resources
  const pluginManifest = path.join(folderPath, 'src', 'main', 'resources', 'manifest.json')

  if (await pathExists(rootManifest)) {
    return readJsonFile(rootManifest)
  }
  if (await pathExists(serverManifest)) {
    return readJsonFile(serverManifest)
  }
  if (await pathExists(pluginManifest)) {
    return readJsonFile(pluginManifest)
  }
  return null
}

/**
 * Read manifest from an archive (zip/jar).
 */
export async function readManifestFromArchive(archivePath: string): Promise<{
  manifest: Record<string, unknown> | null
  hasClasses: boolean
  manifestPath: string | null
}> {
  const data = await fs.readFile(archivePath)
  const zip = await JSZip.loadAsync(data)
  const files = Object.values(zip.files) as JSZip.JSZipObject[]
  const manifestFile =
    files.find((file) => file.name.toLowerCase() === 'manifest.json') ??
    files.find((file) => file.name.toLowerCase() === 'server/manifest.json')
  const hasClasses = files.some((file) => file.name.toLowerCase().endsWith('.class'))

  if (!manifestFile) {
    return { manifest: null, hasClasses, manifestPath: null }
  }

  const manifestRaw = await manifestFile.async('string')
  const manifest = JSON.parse(manifestRaw) as Record<string, unknown>
  return { manifest, hasClasses, manifestPath: manifestFile.name }
}

/**
 * Find the manifest path in a mod folder.
 */
export async function findManifestPath(folderPath: string): Promise<string | null> {
  const rootManifest = path.join(folderPath, 'manifest.json')
  if (await pathExists(rootManifest)) return rootManifest
  const serverManifest = path.join(folderPath, 'Server', 'manifest.json')
  if (await pathExists(serverManifest)) return serverManifest
  // Plugin projects store manifest in src/main/resources
  const pluginManifest = path.join(folderPath, 'src', 'main', 'resources', 'manifest.json')
  if (await pathExists(pluginManifest)) return pluginManifest
  return null
}

function resolveModType(options: {
  location: ModLocation
  manifest: Record<string, unknown> | null
  format: ModFormat
  hasClasses?: boolean
}): ModType {
  if (options.location === 'earlyplugins') {
    return 'early-plugin'
  }
  if (options.manifest && typeof options.manifest.Main === 'string') {
    return 'plugin'
  }
  if (options.hasClasses) {
    return 'plugin'
  }
  if (options.manifest) {
    return 'pack'
  }
  if (options.location === 'packs' || options.format === 'directory') {
    return 'pack'
  }
  return 'unknown'
}

function readManifestDependencies(value: unknown): string[] {
  if (value == null) {
    return []
  }
  // Handle array format: ["mod1", "mod2"]
  if (Array.isArray(value)) {
    return value.filter((item) => typeof item === 'string')
  }
  // Handle object format: { "mod1": ">=1.0.0", "mod2": "*" } or empty {}
  if (typeof value === 'object' && value !== null) {
    return Object.keys(value as Record<string, unknown>)
  }
  return []
}

function createModEntry(params: {
  manifest: Record<string, unknown> | null
  fallbackName: string
  format: ModFormat
  location: ModLocation
  path: string
  hasClasses?: boolean
  enabledOverride?: boolean
  enabledOverrides?: Map<string, boolean>
  size?: number
}): ModEntry {
  const name = typeof params.manifest?.Name === 'string' ? params.manifest.Name : params.fallbackName
  const group = typeof params.manifest?.Group === 'string' ? params.manifest.Group : undefined
  const version = typeof params.manifest?.Version === 'string' ? params.manifest.Version : undefined
  const description = typeof params.manifest?.Description === 'string' ? params.manifest.Description : undefined
  let entryPoint: string | null = null

  if (params.manifest?.Main !== undefined) {
    if (typeof params.manifest.Main === 'string') {
      entryPoint = params.manifest.Main
    }
  }

  const includesAssetPackValue = params.manifest?.IncludesAssetPack
  const dependencies = readManifestDependencies(params.manifest?.Dependencies)
  const optionalDependencies = readManifestDependencies(params.manifest?.OptionalDependencies)
  const includesAssetPack = includesAssetPackValue === true

  const id = group ? `${group}:${name}` : name
  const overrideValue = params.enabledOverrides?.get(id)
  // Hytale defaults mods to disabled if not explicitly enabled in config
  // So we default to false (disabled) when no override is found
  const enabled =
    typeof params.enabledOverride === 'boolean'
      ? params.enabledOverride
      : typeof overrideValue === 'boolean'
        ? overrideValue
        : false

  return {
    id,
    name,
    group,
    version,
    description,
    format: params.format,
    location: params.location,
    path: params.path,
    type: resolveModType({
      location: params.location,
      manifest: params.manifest,
      format: params.format,
      hasClasses: params.hasClasses,
    }),
    entryPoint,
    includesAssetPack,
    enabled,
    dependencies,
    optionalDependencies,
    size: params.size,
  }
}

/**
 * Scan a single mod/project directory.
 */
export async function scanSingleMod(
  fullPath: string,
  format: ModFormat,
  location: ModLocation,
): Promise<ModEntry | null> {
  if (!(await pathExists(fullPath))) {
    return null
  }

  let manifest: Record<string, unknown> | null = null

  try {
    manifest = await readManifestFromFolder(fullPath)
  } catch {
    // Failed to read manifest.json
  }

  const size = await getPathSize(fullPath)
  const fallbackName = path.basename(fullPath)

  return createModEntry({
    manifest,
    fallbackName,
    format,
    location,
    path: fullPath,
    size,
  })
}

/**
 * Scan a mods folder.
 */
export async function scanModsFolder(
  modsPath: string,
  enabledOverride?: boolean,
  enabledOverrides?: Map<string, boolean>,
): Promise<ModEntry[]> {
  const entries = await fs.readdir(modsPath, { withFileTypes: true })
  const mods: ModEntry[] = []

  for (const entry of entries) {
    const fullPath = path.join(modsPath, entry.name)

    if (entry.isDirectory()) {
      let manifest: Record<string, unknown> | null = null

      try {
        manifest = await readManifestFromFolder(fullPath)
      } catch {
        // Failed to read manifest.json
      }

      const size = await getPathSize(fullPath)

      const modEntry = createModEntry({
        manifest,
        fallbackName: entry.name,
        format: 'directory',
        location: 'mods',
        path: fullPath,
        enabledOverride,
        enabledOverrides,
        size,
      })

      mods.push(modEntry)
      continue
    }

    const lowerName = entry.name.toLowerCase()
    if (!lowerName.endsWith('.zip') && !lowerName.endsWith('.jar')) {
      continue
    }

    let manifest: Record<string, unknown> | null = null
    let hasClasses = false

    try {
      const result = await readManifestFromArchive(fullPath)
      manifest = result.manifest
      hasClasses = result.hasClasses
    } catch {
      // Failed to read archive manifest
    }

    const size = await getPathSize(fullPath)
    const format: ModFormat = lowerName.endsWith('.jar') ? 'jar' : 'zip'
    const modEntry = createModEntry({
      manifest,
      fallbackName: entry.name,
      format,
      location: 'mods',
      path: fullPath,
      hasClasses,
      enabledOverride,
      enabledOverrides,
      size,
    })

    mods.push(modEntry)
  }

  return mods
}

/**
 * Scan the early plugins folder.
 */
export async function scanEarlyPluginsFolder(
  earlyPluginsPath: string,
  enabledOverride?: boolean,
  enabledOverrides?: Map<string, boolean>,
): Promise<ModEntry[]> {
  const entries = await fs.readdir(earlyPluginsPath, { withFileTypes: true })
  const mods: ModEntry[] = []

  for (const entry of entries) {
    if (!entry.isFile()) continue
    const lowerName = entry.name.toLowerCase()
    if (!lowerName.endsWith('.jar')) continue

    const fullPath = path.join(earlyPluginsPath, entry.name)
    let manifest: Record<string, unknown> | null = null
    let hasClasses = false

    try {
      const result = await readManifestFromArchive(fullPath)
      manifest = result.manifest
      hasClasses = result.hasClasses
    } catch {
      // Failed to read archive manifest
    }

    const size = await getPathSize(fullPath)

    const modEntry = createModEntry({
      manifest,
      fallbackName: entry.name,
      format: 'jar',
      location: 'earlyplugins',
      path: fullPath,
      hasClasses,
      enabledOverride,
      enabledOverrides,
      size,
    })

    mods.push(modEntry)
  }

  return mods
}

/**
 * Validate mod dependencies.
 */
export function validateModDependencies(entries: ModEntry[]): ModValidationResult {
  const issues: DependencyIssue[] = []

  // Build maps for quick lookup
  const installedMods = new Map<string, ModEntry>()
  const enabledMods = new Set<string>()

  for (const entry of entries) {
    installedMods.set(entry.id, entry)
    if (entry.enabled) {
      enabledMods.add(entry.id)
    }
  }

  // Check each enabled mod's dependencies
  for (const entry of entries) {
    if (!entry.enabled) continue

    // Check required dependencies
    for (const depId of entry.dependencies) {
      const depMod = installedMods.get(depId)

      if (!depMod) {
        // Dependency not installed
        issues.push({
          modId: entry.id,
          modName: entry.name,
          type: 'missing_dependency',
          dependencyId: depId,
          message: `Required dependency "${depId}" is not installed`,
        })
      } else if (!depMod.enabled) {
        // Dependency installed but disabled
        issues.push({
          modId: entry.id,
          modName: entry.name,
          type: 'disabled_dependency',
          dependencyId: depId,
          message: `Required dependency "${depId}" is disabled`,
        })
      }
    }

    // Check optional dependencies (informational only)
    for (const depId of entry.optionalDependencies) {
      const depMod = installedMods.get(depId)

      if (!depMod) {
        issues.push({
          modId: entry.id,
          modName: entry.name,
          type: 'optional_missing',
          dependencyId: depId,
          message: `Optional dependency "${depId}" is not installed`,
        })
      }
    }
  }

  // Determine if there are errors (missing/disabled required deps) or just warnings (optional missing)
  const hasErrors = issues.some(
    (issue) => issue.type === 'missing_dependency' || issue.type === 'disabled_dependency'
  )
  const hasWarnings = issues.some((issue) => issue.type === 'optional_missing')

  return { issues, hasErrors, hasWarnings }
}

/**
 * Scan all mods (optionally for a specific world).
 */
export async function scanModsWithWorld(worldId?: string): Promise<ScanResult> {
  const info = await resolveInstallInfo()

  if (!info.activePath) {
    return { installPath: null, entries: [] }
  }

  const entries: ModEntry[] = []
  const disabledRoot = getDisabledRoot()
  const disabledPaths = {
    mods: path.join(disabledRoot, 'mods'),
    earlyplugins: path.join(disabledRoot, 'earlyplugins'),
  }

  // Get world overrides - either from specified world or active world
  let worldOverrides: Map<string, boolean> | null = null
  if (worldId && info.userDataPath) {
    const config = await getWorldConfig(worldId)
    if (config?.Mods) {
      worldOverrides = new Map()
      for (const [modId, modConfig] of Object.entries(config.Mods)) {
        if (typeof modConfig?.Enabled === 'boolean') {
          worldOverrides.set(modId, modConfig.Enabled)
        }
      }
    }
  } else {
    worldOverrides = await readActiveWorldModOverrides(info.userDataPath)
  }

  if (info.modsPath) {
    entries.push(...(await scanModsFolder(info.modsPath, undefined, worldOverrides ?? undefined)))
  }

  if (await pathExists(disabledPaths.mods)) {
    entries.push(...(await scanModsFolder(disabledPaths.mods, false, worldOverrides ?? undefined)))
  }

  if (info.earlyPluginsPath) {
    entries.push(...(await scanEarlyPluginsFolder(info.earlyPluginsPath, undefined, worldOverrides ?? undefined)))
  }

  if (await pathExists(disabledPaths.earlyplugins)) {
    entries.push(...(await scanEarlyPluginsFolder(disabledPaths.earlyplugins, false, worldOverrides ?? undefined)))
  }

  entries.sort((a, b) => a.name.localeCompare(b.name))

  await seedProfilesFromScan(entries)
  await syncDefaultProfileFromScan(entries)

  // Validate mod dependencies
  const validation = validateModDependencies(entries)

  return { installPath: info.activePath, entries, validation }
}

/**
 * Scan all mods (without world-specific overrides).
 */
export async function scanMods(): Promise<ScanResult> {
  const info = await resolveInstallInfo()

  if (!info.activePath) {
    return { installPath: null, entries: [] }
  }

  const entries: ModEntry[] = []
  const disabledRoot = getDisabledRoot()
  const disabledPaths = {
    mods: path.join(disabledRoot, 'mods'),
    earlyplugins: path.join(disabledRoot, 'earlyplugins'),
  }
  const worldOverrides = await readActiveWorldModOverrides(info.userDataPath)

  if (info.modsPath) {
    entries.push(...(await scanModsFolder(info.modsPath, undefined, worldOverrides ?? undefined)))
  }

  if (await pathExists(disabledPaths.mods)) {
    entries.push(...(await scanModsFolder(disabledPaths.mods, false, worldOverrides ?? undefined)))
  }

  if (info.earlyPluginsPath) {
    entries.push(...(await scanEarlyPluginsFolder(info.earlyPluginsPath, undefined, worldOverrides ?? undefined)))
  }

  if (await pathExists(disabledPaths.earlyplugins)) {
    entries.push(...(await scanEarlyPluginsFolder(disabledPaths.earlyplugins, false, worldOverrides ?? undefined)))
  }

  entries.sort((a, b) => a.name.localeCompare(b.name))

  await seedProfilesFromScan(entries)
  await syncDefaultProfileFromScan(entries)

  return { installPath: info.activePath, entries }
}

/**
 * Delete a mod.
 */
export async function deleteMod(options: DeleteModOptions): Promise<DeleteModResult> {
  const info = await resolveInstallInfo()

  if (!info.activePath) {
    throw new Error('Hytale install path not configured.')
  }

  // Safety: Verify mod path is within allowed locations
  const allowedRoots = [info.modsPath, info.earlyPluginsPath, getDisabledRoot()].filter(
    Boolean,
  ) as string[]

  const isWithinAllowed = allowedRoots.some((root) => isWithinPath(options.modPath, root))
  if (!isWithinAllowed) {
    throw new Error('Cannot delete mod: path is outside allowed mod folders.')
  }

  // Verify file/folder exists
  if (!(await pathExists(options.modPath))) {
    throw new Error('Mod not found at specified path.')
  }

  // Create backup before deletion
  const backupRoot = getDeletedModsRoot()
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
  const backupPath = path.join(backupRoot, `${path.basename(options.modPath)}_${timestamp}`)

  await ensureDir(backupRoot)
  await copyPath(options.modPath, backupPath)

  // Delete the mod
  await removePath(options.modPath)

  return { success: true, backupPath }
}

/**
 * Add mods via file dialog.
 */
export async function addMods(): Promise<AddModResult> {
  const info = await resolveInstallInfo()

  if (!info.modsPath) {
    throw new Error('Mods folder not found.')
  }

  // Open file dialog for mod selection
  const result = await dialog.showOpenDialog({
    title: 'Add Mods',
    properties: ['openFile', 'multiSelections'],
    filters: [
      { name: 'Mod Files', extensions: ['zip', 'jar'] },
      { name: 'All Files', extensions: ['*'] },
    ],
  })

  if (result.canceled || result.filePaths.length === 0) {
    throw new Error('Import cancelled.')
  }

  const skippedMods: string[] = []
  const addedPaths: string[] = []

  await ensureDir(info.modsPath)

  for (const sourcePath of result.filePaths) {
    const baseName = path.basename(sourcePath)
    const destPath = path.join(info.modsPath, baseName)

    // Safety: Check for overwrites
    if (await pathExists(destPath)) {
      skippedMods.push(`Skipped ${baseName}: already exists in Mods folder.`)
      continue
    }

    await copyPath(sourcePath, destPath)
    addedPaths.push(destPath)
  }

  if (addedPaths.length === 0 && skippedMods.length > 0) {
    throw new Error('No mods were added. ' + skippedMods.join(' '))
  }

  return { success: true, addedPaths }
}

/**
 * Apply a profile (enable/disable mods based on profile settings).
 */
export async function applyProfile(profileId: string): Promise<ApplyResult> {
  const info = await resolveInstallInfo()
  if (!info.activePath) {
    throw new Error('Hytale install path not configured.')
  }

  const profiles = await getProfilesFromDatabase()
  const profile = profiles.find((entry) => entry.id === profileId)
  if (!profile) {
    throw new Error('Profile not found.')
  }

  const scan = await scanMods()
  const enabledSet = new Set(profile.enabledMods)
  const entryIds = new Set(scan.entries.map((entry) => entry.id))

  for (const id of enabledSet) {
    if (!entryIds.has(id)) {
      // Mod not found in library
    }
  }

  const disabledRoot = getDisabledRoot()

  for (const entry of scan.entries) {
    const shouldEnable = enabledSet.has(entry.id)
    const currentlyDisabled = isWithinPath(entry.path, disabledRoot)

    if (shouldEnable && currentlyDisabled) {
      const targetRoot = getLocationPath(info, entry.location)
      if (!targetRoot) {
        continue
      }
      await ensureDir(targetRoot)
      const targetPath = path.join(targetRoot, path.basename(entry.path))
      if (await pathExists(targetPath)) {
        continue
      }
      await movePath(entry.path, targetPath)
      continue
    }

    if (!shouldEnable && !currentlyDisabled) {
      const disabledLocation = path.join(disabledRoot, entry.location)
      await ensureDir(disabledLocation)
      const targetPath = path.join(disabledLocation, path.basename(entry.path))
      if (await pathExists(targetPath)) {
        continue
      }
      await movePath(entry.path, targetPath)
    }
  }

  await syncActiveWorldModConfig(info.userDataPath, enabledSet, scan.entries)

  return {
    profileId: profile.id,
    appliedAt: new Date().toISOString(),
  }
}
