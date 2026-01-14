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
  rollbackLastApply: () => electron.ipcRenderer.invoke("hymn:rollback-last-apply")
};
electron.contextBridge.exposeInMainWorld("hymn", api);
