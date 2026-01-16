import { contextBridge, ipcRenderer } from 'electron'
import type { HymnApi } from '../src/shared/hymn-types'

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
  rollbackLastApply: () => ipcRenderer.invoke('hymn:rollback-last-apply'),
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
  getBackups: () => ipcRenderer.invoke('hymn:get-backups'),
  restoreBackup: (backupId: string) => ipcRenderer.invoke('hymn:restore-backup', backupId),
  deleteBackup: (backupId: string) => ipcRenderer.invoke('hymn:delete-backup', backupId),
  exportModpack: (options) => ipcRenderer.invoke('hymn:export-modpack', options),
  importModpack: () => ipcRenderer.invoke('hymn:import-modpack'),
  openInExplorer: (path: string) => ipcRenderer.invoke('hymn:open-in-explorer', path),
  listProjectFiles: (options) => ipcRenderer.invoke('hymn:list-project-files', options),
  readFile: (path: string) => ipcRenderer.invoke('hymn:read-file', path),
  saveFile: (path: string, content: string) => ipcRenderer.invoke('hymn:save-file', path, content),
  checkPathExists: (path: string) => ipcRenderer.invoke('hymn:check-path-exists', path),
}

contextBridge.exposeInMainWorld('hymn', api)
