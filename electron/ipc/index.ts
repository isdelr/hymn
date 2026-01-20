import { BrowserWindow } from 'electron'
import { registerHymnHandlers } from './hymnHandlers'
import { registerSettingsHandlers } from './settingsHandlers'
import { registerThemeHandlers } from './themeHandlers'
import { registerWindowHandlers, shouldForceClose, resetForceClose } from './windowHandlers'
import { registerWatcherHandlers } from './watcherHandlers'
import { registerUpdateHandlers } from './updateHandlers'

export function registerAllIpcHandlers(getWindow: () => BrowserWindow | null): void {
  registerHymnHandlers()
  registerSettingsHandlers()
  registerThemeHandlers()
  registerWindowHandlers(getWindow)
  registerWatcherHandlers()
  registerUpdateHandlers()
}

export {
  registerHymnHandlers,
  registerSettingsHandlers,
  registerThemeHandlers,
  registerWindowHandlers,
  registerWatcherHandlers,
  registerUpdateHandlers,
  shouldForceClose,
  resetForceClose,
}
