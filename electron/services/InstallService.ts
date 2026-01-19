import path from 'node:path'
import { pathExists } from '../utils/fileSystem'
import { getDefaultInstallPath } from '../core/paths'
import { readSetting, writeSetting, SETTINGS_KEYS } from '../core/database'
import type { InstallInfo, ModLocation } from '../../src/shared/hymn-types'

// Module-level state
let installPathOverride: string | null = null

/**
 * Load persisted install path override from database.
 */
export async function loadInstallPathOverride(): Promise<void> {
  installPathOverride = await readSetting(SETTINGS_KEYS.installPath)
}

/**
 * Get the current install path override.
 */
export function getInstallPathOverride(): string | null {
  return installPathOverride
}

/**
 * Set the install path override and persist it.
 */
export async function setInstallPathOverride(newPath: string | null): Promise<void> {
  installPathOverride = newPath
  await writeSetting(SETTINGS_KEYS.installPath, newPath)
}

/**
 * Resolve current Hytale installation info.
 */
export async function resolveInstallInfo(): Promise<InstallInfo> {
  const defaultPath = getDefaultInstallPath()
  const detectedPath = (await pathExists(defaultPath)) ? defaultPath : null
  const activePath = installPathOverride ?? detectedPath
  const userDataPath = activePath ? path.join(activePath, 'UserData') : null
  const modsPath = userDataPath ? path.join(userDataPath, 'Mods') : null
  const earlyPluginsPath = activePath ? path.join(activePath, 'earlyplugins') : null
  const issues: string[] = []

  if (activePath && !(await pathExists(activePath))) {
    issues.push('Install path does not exist.')
  }
  if (userDataPath && !(await pathExists(userDataPath))) {
    issues.push('UserData folder not found.')
  }

  return {
    defaultPath,
    detectedPath,
    activePath,
    userDataPath,
    modsPath: modsPath && (await pathExists(modsPath)) ? modsPath : null,
    earlyPluginsPath: earlyPluginsPath && (await pathExists(earlyPluginsPath)) ? earlyPluginsPath : null,
    issues,
  }
}

/**
 * Get the path for a specific mod location (mods, packs, or earlyplugins).
 */
export function getLocationPath(info: InstallInfo, location: ModLocation): string | null {
  const userDataPath = info.userDataPath ?? (info.activePath ? path.join(info.activePath, 'UserData') : null)
  if (location === 'earlyplugins') {
    return info.earlyPluginsPath ?? (info.activePath ? path.join(info.activePath, 'earlyplugins') : null)
  }
  if (!userDataPath) return null
  // Both 'mods' and 'packs' go to Mods folder
  return info.modsPath ?? path.join(userDataPath, 'Mods')
}
