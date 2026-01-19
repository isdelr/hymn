import { BrowserWindow } from 'electron'
import { registerHymnHandlers } from './hymnHandlers'
import { registerSettingsHandlers } from './settingsHandlers'
import { registerThemeHandlers } from './themeHandlers'
import { registerWindowHandlers } from './windowHandlers'
import { registerWatcherHandlers } from './watcherHandlers'

export function registerAllIpcHandlers(getWindow: () => BrowserWindow | null): void {
  registerHymnHandlers()
  registerSettingsHandlers()
  registerThemeHandlers()
  registerWindowHandlers(getWindow)
  registerWatcherHandlers()
}

export {
  registerHymnHandlers,
  registerSettingsHandlers,
  registerThemeHandlers,
  registerWindowHandlers,
  registerWatcherHandlers,
}
