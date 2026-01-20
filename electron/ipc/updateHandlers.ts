import { ipcMain } from 'electron'
import {
  getUpdateInfo,
  checkForUpdates,
  downloadUpdate,
  installUpdate,
} from '../services/UpdateService'

export function registerUpdateHandlers(): void {
  // Get current update status
  ipcMain.handle('update:getInfo', () => {
    return getUpdateInfo()
  })

  // Trigger manual update check
  ipcMain.handle('update:check', async () => {
    return checkForUpdates()
  })

  // Start downloading the update
  ipcMain.handle('update:download', async () => {
    await downloadUpdate()
  })

  // Quit and install the update
  ipcMain.handle('update:install', () => {
    installUpdate()
  })
}
