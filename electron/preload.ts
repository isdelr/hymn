import { contextBridge, ipcRenderer } from 'electron'
import type { HymnApi } from '../src/shared/hymn-types'

const api: HymnApi = {
  getInstallInfo: () => ipcRenderer.invoke('hymn:get-install-info'),
  selectInstallPath: () => ipcRenderer.invoke('hymn:select-install-path'),
  scanMods: () => ipcRenderer.invoke('hymn:scan-mods'),
  getProfiles: () => ipcRenderer.invoke('hymn:get-profiles'),
  createProfile: (name: string) => ipcRenderer.invoke('hymn:create-profile', name),
  updateProfile: (profile) => ipcRenderer.invoke('hymn:update-profile', profile),
  setActiveProfile: (profileId: string) => ipcRenderer.invoke('hymn:set-active-profile', profileId),
  applyProfile: (profileId: string) => ipcRenderer.invoke('hymn:apply-profile', profileId),
  rollbackLastApply: () => ipcRenderer.invoke('hymn:rollback-last-apply'),
}

contextBridge.exposeInMainWorld('hymn', api)

