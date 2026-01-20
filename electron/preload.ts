import { contextBridge, ipcRenderer } from 'electron'
import type { HymnApi, HymnWindowApi, HymnThemeApi, HymnSettingsApi, HymnFileWatcherApi, HymnUpdateApi, ThemeMode, ModSortOrder, FileChangeEvent, DirectoryChangeEvent, WorldConfigChangeEvent, JdkDownloadProgress, GradleVersion, RestoreDeletedModOptions, SelectAssetFileOptions, ListPackLanguagesOptions, GetPackTranslationsOptions, SavePackTranslationsOptions, CreatePackLanguageOptions, Platform, SupportedJdkVersion, UpdateInfo } from '../src/shared/hymn-types'

// Input validation helpers for preload security
function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

function isValidPath(value: unknown): value is string {
  if (!isNonEmptyString(value)) return false
  // Block null bytes which could bypass path validation
  if (value.includes('\0')) return false
  return true
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function validateOrThrow(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(`Validation failed: ${message}`)
  }
}

const windowApi: HymnWindowApi = {
  minimize: () => ipcRenderer.invoke('window:minimize'),
  maximize: () => ipcRenderer.invoke('window:maximize'),
  close: () => ipcRenderer.invoke('window:close'),
  forceClose: () => ipcRenderer.invoke('window:forceClose'),
  isMaximized: () => ipcRenderer.invoke('window:isMaximized'),
  onMaximizedChange: (callback: (isMaximized: boolean) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, isMaximized: boolean) => callback(isMaximized)
    ipcRenderer.on('window:maximized-change', handler)
    return () => {
      ipcRenderer.removeListener('window:maximized-change', handler)
    }
  },
  onCloseRequested: (callback: () => void) => {
    const handler = () => callback()
    ipcRenderer.on('window:close-requested', handler)
    return () => {
      ipcRenderer.removeListener('window:close-requested', handler)
    }
  },
  getPlatform: () => process.platform as Platform,
}

const api: HymnApi = {
  getInstallInfo: () => ipcRenderer.invoke('hymn:get-install-info'),
  selectInstallPath: () => ipcRenderer.invoke('hymn:select-install-path'),
  scanMods: (worldId?: string) => ipcRenderer.invoke('hymn:scan-mods', worldId),
  // Legacy profile methods (kept for backwards compatibility)
  getProfiles: () => ipcRenderer.invoke('hymn:get-profiles'),
  createProfile: (name: string) => ipcRenderer.invoke('hymn:create-profile', name),
  updateProfile: (profile) => ipcRenderer.invoke('hymn:update-profile', profile),
  setActiveProfile: (profileId: string) => ipcRenderer.invoke('hymn:set-active-profile', profileId),
  applyProfile: (profileId: string) => ipcRenderer.invoke('hymn:apply-profile', profileId),
  // World management methods
  getWorlds: () => ipcRenderer.invoke('hymn:get-worlds'),
  getWorldConfig: (worldId: string) => ipcRenderer.invoke('hymn:get-world-config', worldId),
  setModEnabled: (options) => ipcRenderer.invoke('hymn:set-mod-enabled', options),
  setSelectedWorld: (worldId: string) => ipcRenderer.invoke('hymn:set-selected-world', worldId),
  // Mod management methods
  deleteMod: (options) => ipcRenderer.invoke('hymn:delete-mod', options),
  addMods: () => ipcRenderer.invoke('hymn:add-mods'),
  // Pack/mod creation and editing
  createPack: (options) => ipcRenderer.invoke('hymn:create-pack', options),
  createPlugin: (options) => ipcRenderer.invoke('hymn:create-plugin', options),
  getModManifest: (options) => ipcRenderer.invoke('hymn:get-mod-manifest', options),
  saveModManifest: (options) => ipcRenderer.invoke('hymn:save-mod-manifest', options),
  listModAssets: (options) => ipcRenderer.invoke('hymn:list-mod-assets', options),
  buildMod: (options) => ipcRenderer.invoke('hymn:build-mod', options),
  listServerAssets: (options) => ipcRenderer.invoke('hymn:list-server-assets', options),
  createServerAsset: (options) => ipcRenderer.invoke('hymn:create-server-asset', options),
  duplicateServerAsset: (options) => ipcRenderer.invoke('hymn:duplicate-server-asset', options),
  moveServerAsset: (options) => ipcRenderer.invoke('hymn:move-server-asset', options),
  deleteServerAsset: (options) => ipcRenderer.invoke('hymn:delete-server-asset', options),
  listVanillaAssets: (options) => ipcRenderer.invoke('hymn:list-vanilla-assets', options),
  importVanillaAsset: (options) => ipcRenderer.invoke('hymn:import-vanilla-asset', options),
  exportModpack: (options) => ipcRenderer.invoke('hymn:export-modpack', options),
  importModpack: () => ipcRenderer.invoke('hymn:import-modpack'),
  // World-based mod export/import
  exportWorldMods: (options) => ipcRenderer.invoke('hymn:export-world-mods', options),
  importWorldMods: () => ipcRenderer.invoke('hymn:import-world-mods'),
  // Projects folder management
  listProjects: () => ipcRenderer.invoke('hymn:list-projects'),
  deleteProject: (options) => ipcRenderer.invoke('hymn:delete-project', options),
  installProject: (options) => ipcRenderer.invoke('hymn:install-project', options),
  uninstallProject: (options) => ipcRenderer.invoke('hymn:uninstall-project', options),
  // Package mod (zip creation)
  packageMod: (options) => ipcRenderer.invoke('hymn:package-mod', options),
  openInExplorer: (path: string) => {
    validateOrThrow(isValidPath(path), 'Invalid path for openInExplorer')
    return ipcRenderer.invoke('hymn:open-in-explorer', path)
  },
  listProjectFiles: (options) => {
    validateOrThrow(isObject(options), 'Invalid options for listProjectFiles')
    return ipcRenderer.invoke('hymn:list-project-files', options)
  },
  readFile: (path: string) => {
    validateOrThrow(isValidPath(path), 'Invalid path for readFile')
    return ipcRenderer.invoke('hymn:read-file', path)
  },
  saveFile: (path: string, content: string) => {
    validateOrThrow(isValidPath(path), 'Invalid path for saveFile')
    validateOrThrow(typeof content === 'string', 'Invalid content for saveFile')
    return ipcRenderer.invoke('hymn:save-file', path, content)
  },
  checkPathExists: (path: string) => {
    validateOrThrow(isValidPath(path), 'Invalid path for checkPathExists')
    return ipcRenderer.invoke('hymn:check-path-exists', path)
  },
  selectAssetFile: (options: SelectAssetFileOptions) => ipcRenderer.invoke('hymn:select-asset-file', options),
  // Java source file management for plugins
  listJavaSources: (options) => ipcRenderer.invoke('hymn:list-java-sources', options),
  createJavaClass: (options) => ipcRenderer.invoke('hymn:create-java-class', options),
  deleteJavaClass: (options) => ipcRenderer.invoke('hymn:delete-java-class', options),
  renameJavaFile: (options) => ipcRenderer.invoke('hymn:rename-java-file', options),
  deleteJavaPackage: (options) => ipcRenderer.invoke('hymn:delete-java-package', options),
  renameJavaPackage: (options) => ipcRenderer.invoke('hymn:rename-java-package', options),
  // Build workflow methods
  checkDependencies: () => ipcRenderer.invoke('hymn:check-dependencies'),
  buildPlugin: (options) => ipcRenderer.invoke('hymn:build-plugin', options),
  buildPack: (options) => ipcRenderer.invoke('hymn:build-pack', options),
  listBuildArtifacts: () => ipcRenderer.invoke('hymn:list-build-artifacts'),
  deleteBuildArtifact: (options) => ipcRenderer.invoke('hymn:delete-build-artifact', options),
  clearAllBuildArtifacts: () => ipcRenderer.invoke('hymn:clear-all-build-artifacts'),
  revealBuildArtifact: (artifactId) => ipcRenderer.invoke('hymn:reveal-build-artifact', artifactId),
  copyArtifactToMods: (artifactId) => ipcRenderer.invoke('hymn:copy-artifact-to-mods', artifactId),
  listInstalledMods: () => ipcRenderer.invoke('hymn:list-installed-mods'),
  openBuildsFolder: () => ipcRenderer.invoke('hymn:open-builds-folder'),
  openInEditor: (path: string) => {
    validateOrThrow(isValidPath(path), 'Invalid path for openInEditor')
    return ipcRenderer.invoke('hymn:open-in-editor', path)
  },
  // Deleted mods management
  listDeletedMods: () => ipcRenderer.invoke('hymn:list-deleted-mods'),
  restoreDeletedMod: (options: RestoreDeletedModOptions) => ipcRenderer.invoke('hymn:restore-deleted-mod', options),
  permanentlyDeleteMod: (options: { backupId: string }) => ipcRenderer.invoke('hymn:permanently-delete-mod', options),
  clearDeletedMods: () => ipcRenderer.invoke('hymn:clear-deleted-mods'),
  // Translation management
  listPackLanguages: (options: ListPackLanguagesOptions) => ipcRenderer.invoke('hymn:list-pack-languages', options),
  getPackTranslations: (options: GetPackTranslationsOptions) => ipcRenderer.invoke('hymn:get-pack-translations', options),
  savePackTranslations: (options: SavePackTranslationsOptions) => ipcRenderer.invoke('hymn:save-pack-translations', options),
  createPackLanguage: (options: CreatePackLanguageOptions) => ipcRenderer.invoke('hymn:create-pack-language', options),
}

const themeApi: HymnThemeApi = {
  get: () => ipcRenderer.invoke('theme:get'),
  set: (theme: ThemeMode) => ipcRenderer.invoke('theme:set', theme),
  onChange: (callback: (isDark: boolean) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, isDark: boolean) => callback(isDark)
    ipcRenderer.on('theme:changed', handler)
    return () => {
      ipcRenderer.removeListener('theme:changed', handler)
    }
  },
}

const settingsApi: HymnSettingsApi = {
  getTheme: () => ipcRenderer.invoke('settings:getTheme'),
  setTheme: (theme: ThemeMode) => ipcRenderer.invoke('settings:setTheme', theme),
  getModSortOrder: () => ipcRenderer.invoke('settings:getModSortOrder'),
  setModSortOrder: (order: ModSortOrder) => ipcRenderer.invoke('settings:setModSortOrder', order),
  getDefaultExportPath: () => ipcRenderer.invoke('settings:getDefaultExportPath'),
  setDefaultExportPath: (path: string | null) => ipcRenderer.invoke('settings:setDefaultExportPath', path),
  selectDefaultExportPath: () => ipcRenderer.invoke('settings:selectDefaultExportPath'),
  // JDK path configuration
  getJdkPath: () => ipcRenderer.invoke('settings:getJdkPath'),
  setJdkPath: (path: string | null) => ipcRenderer.invoke('settings:setJdkPath', path),
  selectJdkPath: () => ipcRenderer.invoke('settings:selectJdkPath'),
  // Managed JDK (auto-downloaded)
  getManagedJdkPath: () => ipcRenderer.invoke('settings:getManagedJdkPath'),
  downloadJdk: (version?: SupportedJdkVersion) => ipcRenderer.invoke('settings:downloadJdk', version),
  cancelJdkDownload: () => ipcRenderer.invoke('settings:cancelJdkDownload'),
  onJdkDownloadProgress: (callback: (progress: JdkDownloadProgress) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, progress: JdkDownloadProgress) => callback(progress)
    ipcRenderer.on('jdk:download-progress', handler)
    return () => {
      ipcRenderer.removeListener('jdk:download-progress', handler)
    }
  },
  // HytaleServer.jar path configuration
  getServerJarPath: () => ipcRenderer.invoke('settings:getServerJarPath'),
  setServerJarPath: (path: string | null) => ipcRenderer.invoke('settings:setServerJarPath', path),
  selectServerJarPath: () => ipcRenderer.invoke('settings:selectServerJarPath'),
  // Gradle version configuration
  getGradleVersion: () => ipcRenderer.invoke('settings:getGradleVersion'),
  setGradleVersion: (version: GradleVersion) => ipcRenderer.invoke('settings:setGradleVersion', version),
  // App version
  getAppVersion: () => ipcRenderer.invoke('settings:getAppVersion'),
}

const fileWatcherApi: HymnFileWatcherApi = {
  watchProject: (projectPath: string) => ipcRenderer.invoke('hymn:watch-project', projectPath),
  unwatchProject: () => ipcRenderer.invoke('hymn:unwatch-project'),
  onFileChange: (callback: (event: FileChangeEvent) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, changeEvent: FileChangeEvent) => callback(changeEvent)
    ipcRenderer.on('project:file-changed', handler)
    return () => {
      ipcRenderer.removeListener('project:file-changed', handler)
    }
  },
  // Directory watcher methods
  startModsWatcher: (modsPath: string | null, earlyPluginsPath: string | null) =>
    ipcRenderer.invoke('hymn:start-mods-watcher', modsPath, earlyPluginsPath),
  stopModsWatcher: () => ipcRenderer.invoke('hymn:stop-mods-watcher'),
  startProjectsWatcher: () => ipcRenderer.invoke('hymn:start-projects-watcher'),
  stopProjectsWatcher: () => ipcRenderer.invoke('hymn:stop-projects-watcher'),
  startBuildsWatcher: () => ipcRenderer.invoke('hymn:start-builds-watcher'),
  stopBuildsWatcher: () => ipcRenderer.invoke('hymn:stop-builds-watcher'),
  onProjectsChange: (callback: (event: DirectoryChangeEvent) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, changeEvent: DirectoryChangeEvent) => callback(changeEvent)
    ipcRenderer.on('directory:projects-changed', handler)
    return () => {
      ipcRenderer.removeListener('directory:projects-changed', handler)
    }
  },
  onBuildsChange: (callback: (event: DirectoryChangeEvent) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, changeEvent: DirectoryChangeEvent) => callback(changeEvent)
    ipcRenderer.on('directory:builds-changed', handler)
    return () => {
      ipcRenderer.removeListener('directory:builds-changed', handler)
    }
  },
  onModsChange: (callback: (event: DirectoryChangeEvent) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, changeEvent: DirectoryChangeEvent) => callback(changeEvent)
    ipcRenderer.on('directory:mods-changed', handler)
    return () => {
      ipcRenderer.removeListener('directory:mods-changed', handler)
    }
  },
  // World config watcher methods
  startWorldConfigWatcher: (savesPath: string) =>
    ipcRenderer.invoke('hymn:start-world-config-watcher', savesPath),
  stopWorldConfigWatcher: () => ipcRenderer.invoke('hymn:stop-world-config-watcher'),
  onWorldConfigChange: (callback: (event: WorldConfigChangeEvent) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, changeEvent: WorldConfigChangeEvent) => callback(changeEvent)
    ipcRenderer.on('world:config-changed', handler)
    return () => {
      ipcRenderer.removeListener('world:config-changed', handler)
    }
  },
}

const updateApi: HymnUpdateApi = {
  getInfo: () => ipcRenderer.invoke('update:getInfo'),
  checkForUpdates: () => ipcRenderer.invoke('update:check'),
  downloadUpdate: () => ipcRenderer.invoke('update:download'),
  installUpdate: () => ipcRenderer.invoke('update:install'),
  onUpdateStatus: (callback: (info: UpdateInfo) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, info: UpdateInfo) => callback(info)
    ipcRenderer.on('update:status-changed', handler)
    return () => {
      ipcRenderer.removeListener('update:status-changed', handler)
    }
  },
}

contextBridge.exposeInMainWorld('hymn', api)
contextBridge.exposeInMainWorld('hymnWindow', windowApi)
contextBridge.exposeInMainWorld('hymnTheme', themeApi)
contextBridge.exposeInMainWorld('hymnSettings', settingsApi)
contextBridge.exposeInMainWorld('hymnFileWatcher', fileWatcherApi)
contextBridge.exposeInMainWorld('hymnUpdate', updateApi)
