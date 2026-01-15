"use strict";
const electron = require("electron");
const api = {
  getInstallInfo: () => electron.ipcRenderer.invoke("hymn:get-install-info"),
  selectInstallPath: () => electron.ipcRenderer.invoke("hymn:select-install-path"),
  scanMods: () => electron.ipcRenderer.invoke("hymn:scan-mods"),
  getProfiles: () => electron.ipcRenderer.invoke("hymn:get-profiles"),
  createProfile: (name) => electron.ipcRenderer.invoke("hymn:create-profile", name),
  updateProfile: (profile) => electron.ipcRenderer.invoke("hymn:update-profile", profile),
  setActiveProfile: (profileId) => electron.ipcRenderer.invoke("hymn:set-active-profile", profileId),
  applyProfile: (profileId) => electron.ipcRenderer.invoke("hymn:apply-profile", profileId),
  rollbackLastApply: () => electron.ipcRenderer.invoke("hymn:rollback-last-apply"),
  createPack: (options) => electron.ipcRenderer.invoke("hymn:create-pack", options),
  getModManifest: (options) => electron.ipcRenderer.invoke("hymn:get-mod-manifest", options),
  saveModManifest: (options) => electron.ipcRenderer.invoke("hymn:save-mod-manifest", options),
  listModAssets: (options) => electron.ipcRenderer.invoke("hymn:list-mod-assets", options),
  buildMod: (options) => electron.ipcRenderer.invoke("hymn:build-mod", options),
  listServerAssets: (options) => electron.ipcRenderer.invoke("hymn:list-server-assets", options),
  createServerAsset: (options) => electron.ipcRenderer.invoke("hymn:create-server-asset", options),
  duplicateServerAsset: (options) => electron.ipcRenderer.invoke("hymn:duplicate-server-asset", options),
  moveServerAsset: (options) => electron.ipcRenderer.invoke("hymn:move-server-asset", options),
  deleteServerAsset: (options) => electron.ipcRenderer.invoke("hymn:delete-server-asset", options),
  listVanillaAssets: (options) => electron.ipcRenderer.invoke("hymn:list-vanilla-assets", options),
  importVanillaAsset: (options) => electron.ipcRenderer.invoke("hymn:import-vanilla-asset", options),
  getBackups: () => electron.ipcRenderer.invoke("hymn:get-backups"),
  restoreBackup: (backupId) => electron.ipcRenderer.invoke("hymn:restore-backup", backupId),
  deleteBackup: (backupId) => electron.ipcRenderer.invoke("hymn:delete-backup", backupId),
  exportModpack: (options) => electron.ipcRenderer.invoke("hymn:export-modpack", options),
  importModpack: () => electron.ipcRenderer.invoke("hymn:import-modpack"),
  openInExplorer: (path) => electron.ipcRenderer.invoke("hymn:open-in-explorer", path)
};
electron.contextBridge.exposeInMainWorld("hymn", api);
