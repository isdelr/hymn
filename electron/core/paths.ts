import { app } from 'electron'
import path from 'node:path'
import type { ModLocation } from '../../src/shared/hymn-types'

const DEFAULT_INSTALL_FOLDER = 'Hytale'
const DISABLED_FOLDER = 'disabled'
const DELETED_MODS_FOLDER = 'deleted-mods'

/**
 * Get the default Hytale installation path.
 */
export function getDefaultInstallPath(): string {
  return path.join(app.getPath('appData'), DEFAULT_INSTALL_FOLDER)
}

/**
 * Get the root directory for disabled mods.
 */
export function getDisabledRoot(): string {
  return path.join(app.getPath('userData'), DISABLED_FOLDER)
}

/**
 * Get the root directory for user projects (packs and plugins).
 */
export function getProjectsRoot(): string {
  return path.join(app.getPath('userData'), 'projects')
}

/**
 * Get the root directory for build artifacts.
 */
export function getBuildsRoot(): string {
  return path.join(app.getPath('userData'), 'builds')
}

/**
 * Get the root directory for plugin build artifacts.
 */
export function getPluginBuildsRoot(): string {
  return path.join(getBuildsRoot(), 'plugins')
}

/**
 * Get the root directory for pack build artifacts.
 */
export function getPackBuildsRoot(): string {
  return path.join(getBuildsRoot(), 'packs')
}

/**
 * Get the disabled folder path for a specific mod location.
 */
export function getDisabledLocationPath(location: ModLocation): string {
  return path.join(getDisabledRoot(), location)
}

/**
 * Get the root directory for deleted mod backups.
 */
export function getDeletedModsRoot(): string {
  return path.join(app.getPath('userData'), DELETED_MODS_FOLDER)
}

/**
 * Get the JDK installation directory.
 */
export function getJdkInstallDir(): string {
  return path.join(app.getPath('userData'), 'jdk')
}

/**
 * Get the default Hytale path based on platform.
 */
export function getDefaultHytalePath(): string {
  if (process.platform === 'win32') {
    return path.join(process.env.APPDATA || '', 'Hytale')
  } else if (process.platform === 'darwin') {
    return path.join(process.env.HOME || '', 'Library', 'Application Support', 'Hytale')
  } else {
    // XDG Base Directory spec: use XDG_DATA_HOME if set, otherwise fall back to ~/.local/share
    const xdgDataHome = process.env.XDG_DATA_HOME || path.join(process.env.HOME || '', '.local', 'share')
    return path.join(xdgDataHome, 'Hytale')
  }
}

/**
 * Get the default server JAR path.
 */
export function getDefaultServerJarPath(hytalePath: string, patchline: string): string {
  return path.join(hytalePath, 'install', patchline, 'package', 'game', 'latest', 'Server', 'HytaleServer.jar')
}
