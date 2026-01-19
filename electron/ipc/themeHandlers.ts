import { ipcMain, nativeTheme } from 'electron'
import { writeSetting, SETTINGS_KEYS } from '../core/database'
import type { ThemeMode } from '../../src/shared/hymn-types'

export function registerThemeHandlers(): void {
  ipcMain.handle('theme:get', () => nativeTheme.shouldUseDarkColors)

  ipcMain.handle('theme:set', async (_event, theme: ThemeMode) => {
    nativeTheme.themeSource = theme
    await writeSetting(SETTINGS_KEYS.theme, theme)
  })
}
