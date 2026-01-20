import { ipcMain, BrowserWindow } from 'electron'

// Track whether we should force close (bypass close prevention)
let forceClose = false

export function registerWindowHandlers(getWindow: () => BrowserWindow | null): void {
  ipcMain.handle('window:minimize', () => {
    getWindow()?.minimize()
  })

  ipcMain.handle('window:maximize', () => {
    const win = getWindow()
    if (win?.isMaximized()) {
      win.unmaximize()
    } else {
      win?.maximize()
    }
  })

  ipcMain.handle('window:close', () => {
    getWindow()?.close()
  })

  ipcMain.handle('window:forceClose', () => {
    forceClose = true
    getWindow()?.close()
  })

  ipcMain.handle('window:isMaximized', () => {
    return getWindow()?.isMaximized() ?? false
  })
}

export function shouldForceClose(): boolean {
  return forceClose
}

export function resetForceClose(): void {
  forceClose = false
}
