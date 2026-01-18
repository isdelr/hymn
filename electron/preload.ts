import { contextBridge, ipcRenderer } from 'electron'
import type { HymnApi, HymnWindowApi, HymnThemeApi, HymnSettingsApi, ThemeMode, ModSortOrder } from '../src/shared/hymn-types'

const windowApi: HymnWindowApi = {
  minimize: () => ipcRenderer.invoke('window:minimize'),
  maximize: () => ipcRenderer.invoke('window:maximize'),
  close: () => ipcRenderer.invoke('window:close'),
  isMaximized: () => ipcRenderer.invoke('window:isMaximized'),
  onMaximizedChange: (callback: (isMaximized: boolean) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, isMaximized: boolean) => callback(isMaximized)
    ipcRenderer.on('window:maximized-change', handler)
    return () => {
      ipcRenderer.removeListener('window:maximized-change', handler)
    }
  },
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
  openInExplorer: (path: string) => ipcRenderer.invoke('hymn:open-in-explorer', path),
  listProjectFiles: (options) => ipcRenderer.invoke('hymn:list-project-files', options),
  readFile: (path: string) => ipcRenderer.invoke('hymn:read-file', path),
  saveFile: (path: string, content: string) => ipcRenderer.invoke('hymn:save-file', path, content),
  checkPathExists: (path: string) => ipcRenderer.invoke('hymn:check-path-exists', path),
  // Java source file management for plugins
  listJavaSources: (options) => ipcRenderer.invoke('hymn:list-java-sources', options),
  createJavaClass: (options) => ipcRenderer.invoke('hymn:create-java-class', options),
  deleteJavaClass: (options) => ipcRenderer.invoke('hymn:delete-java-class', options),
  // Build workflow methods
  checkDependencies: () => ipcRenderer.invoke('hymn:check-dependencies'),
  buildPlugin: (options) => ipcRenderer.invoke('hymn:build-plugin', options),
  buildPack: (options) => ipcRenderer.invoke('hymn:build-pack', options),
  listBuildArtifacts: () => ipcRenderer.invoke('hymn:list-build-artifacts'),
  deleteBuildArtifact: (options) => ipcRenderer.invoke('hymn:delete-build-artifact', options),
  clearAllBuildArtifacts: () => ipcRenderer.invoke('hymn:clear-all-build-artifacts'),
  revealBuildArtifact: (artifactId) => ipcRenderer.invoke('hymn:reveal-build-artifact', artifactId),
  copyArtifactToMods: (artifactId) => ipcRenderer.invoke('hymn:copy-artifact-to-mods', artifactId),
  openBuildsFolder: () => ipcRenderer.invoke('hymn:open-builds-folder'),
  openInEditor: (path: string) => ipcRenderer.invoke('hymn:open-in-editor', path),
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
}

contextBridge.exposeInMainWorld('hymn', api)
contextBridge.exposeInMainWorld('hymnWindow', windowApi)
contextBridge.exposeInMainWorld('hymnTheme', themeApi)
contextBridge.exposeInMainWorld('hymnSettings', settingsApi)
