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
  getBackups: () => electron.ipcRenderer.invoke("hymn:get-backups"),
  restoreBackup: (backupId) => electron.ipcRenderer.invoke("hymn:restore-backup", backupId),
  deleteBackup: (backupId) => electron.ipcRenderer.invoke("hymn:delete-backup", backupId),
  exportModpack: (options) => electron.ipcRenderer.invoke("hymn:export-modpack", options),
  importModpack: () => electron.ipcRenderer.invoke("hymn:import-modpack"),
  openInExplorer: (path) => electron.ipcRenderer.invoke("hymn:open-in-explorer", path)
};
electron.contextBridge.exposeInMainWorld("hymn", api);
