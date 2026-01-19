import { ipcMain } from 'electron'
import { watcherManager } from '../fileWatchers'

export function registerWatcherHandlers(): void {
  // Directory watcher handlers
  ipcMain.handle('hymn:start-mods-watcher', async (_event, modsPath: string | null, earlyPluginsPath: string | null) => {
    watcherManager.startModsWatcher(modsPath, earlyPluginsPath)
  })

  ipcMain.handle('hymn:stop-mods-watcher', async () => {
    watcherManager.stopModsWatcher()
  })

  // Projects watcher handlers
  ipcMain.handle('hymn:start-projects-watcher', async () => {
    watcherManager.startProjectsWatcher()
  })

  ipcMain.handle('hymn:stop-projects-watcher', async () => {
    watcherManager.stopProjectsWatcher()
  })

  // Builds watcher handlers
  ipcMain.handle('hymn:start-builds-watcher', async () => {
    watcherManager.startBuildsWatcher()
  })

  ipcMain.handle('hymn:stop-builds-watcher', async () => {
    watcherManager.stopBuildsWatcher()
  })

  // World config watcher handlers (for detecting external mod toggles)
  ipcMain.handle('hymn:start-world-config-watcher', async (_event, savesPath: string) => {
    watcherManager.startWorldConfigWatcher(savesPath)
  })

  ipcMain.handle('hymn:stop-world-config-watcher', async () => {
    watcherManager.stopWorldConfigWatcher()
  })
}
