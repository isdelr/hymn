import { ipcMain, dialog } from 'electron'
import { readSetting, writeSetting, SETTINGS_KEYS } from '../core/database'
import { downloadAndInstallJdk, cancelJdkDownload } from '../services/JdkDownloadService'
import type { ThemeMode, ModSortOrder, GradleVersion } from '../../src/shared/hymn-types'

export function registerSettingsHandlers(): void {
  // Theme settings
  ipcMain.handle('settings:getTheme', async () => {
    const theme = await readSetting(SETTINGS_KEYS.theme)
    return (theme as ThemeMode) || 'system'
  })

  ipcMain.handle('settings:setTheme', async (_event, theme: ThemeMode) => {
    const { nativeTheme } = await import('electron')
    nativeTheme.themeSource = theme
    await writeSetting(SETTINGS_KEYS.theme, theme)
  })

  // Mod sort order settings
  ipcMain.handle('settings:getModSortOrder', async () => {
    const order = await readSetting(SETTINGS_KEYS.modSortOrder)
    return (order as ModSortOrder) || 'name'
  })

  ipcMain.handle('settings:setModSortOrder', async (_event, order: ModSortOrder) => {
    await writeSetting(SETTINGS_KEYS.modSortOrder, order)
  })

  // Default export path settings
  ipcMain.handle('settings:getDefaultExportPath', async () => {
    return readSetting(SETTINGS_KEYS.defaultExportPath)
  })

  ipcMain.handle('settings:setDefaultExportPath', async (_event, exportPath: string | null) => {
    await writeSetting(SETTINGS_KEYS.defaultExportPath, exportPath)
  })

  ipcMain.handle('settings:selectDefaultExportPath', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory'],
      title: 'Select Default Export Folder',
    })
    if (result.canceled || result.filePaths.length === 0) {
      return null
    }
    const selectedPath = result.filePaths[0]
    await writeSetting(SETTINGS_KEYS.defaultExportPath, selectedPath)
    return selectedPath
  })

  // JDK path settings handlers
  ipcMain.handle('settings:getJdkPath', async () => {
    return readSetting(SETTINGS_KEYS.jdkPath)
  })

  ipcMain.handle('settings:setJdkPath', async (_event, jdkPath: string | null) => {
    await writeSetting(SETTINGS_KEYS.jdkPath, jdkPath)
  })

  ipcMain.handle('settings:selectJdkPath', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory'],
      title: 'Select Java Development Kit (JDK) Folder',
    })
    if (result.canceled || result.filePaths.length === 0) {
      return null
    }
    const selectedPath = result.filePaths[0]
    await writeSetting(SETTINGS_KEYS.jdkPath, selectedPath)
    return selectedPath
  })

  // HytaleServer.jar path settings handlers
  ipcMain.handle('settings:getServerJarPath', async () => {
    return readSetting(SETTINGS_KEYS.serverJarPath)
  })

  ipcMain.handle('settings:setServerJarPath', async (_event, serverJarPath: string | null) => {
    await writeSetting(SETTINGS_KEYS.serverJarPath, serverJarPath)
  })

  ipcMain.handle('settings:selectServerJarPath', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openFile'],
      title: 'Select HytaleServer.jar',
      filters: [
        { name: 'JAR Files', extensions: ['jar'] },
        { name: 'All Files', extensions: ['*'] },
      ],
    })
    if (result.canceled || result.filePaths.length === 0) {
      return null
    }
    const selectedPath = result.filePaths[0]
    await writeSetting(SETTINGS_KEYS.serverJarPath, selectedPath)
    return selectedPath
  })

  // Managed JDK handlers (auto-downloaded JDK)
  ipcMain.handle('settings:getManagedJdkPath', async () => {
    return readSetting(SETTINGS_KEYS.managedJdkPath)
  })

  ipcMain.handle('settings:downloadJdk', async () => {
    return downloadAndInstallJdk()
  })

  ipcMain.handle('settings:cancelJdkDownload', async () => {
    cancelJdkDownload()
  })

  // Gradle version settings handlers
  ipcMain.handle('settings:getGradleVersion', async () => {
    const version = await readSetting(SETTINGS_KEYS.gradleVersion)
    return (version as GradleVersion) || '9.3.0'
  })

  ipcMain.handle('settings:setGradleVersion', async (_event, version: GradleVersion) => {
    await writeSetting(SETTINGS_KEYS.gradleVersion, version)
  })
}
