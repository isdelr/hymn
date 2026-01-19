import { app, BrowserWindow } from 'electron'
import * as chokidar from 'chokidar'
import path from 'node:path'
import type { DirectoryChangeEvent, FileChangeEvent, FileChangeType } from '../src/shared/hymn-types'

type DirectoryType = 'projects' | 'builds' | 'mods'

interface WatcherEntry {
  watcher: chokidar.FSWatcher
  type: DirectoryType | 'active-project'
}

// Debounce timers for each directory type
const debounceTimers: Map<string, NodeJS.Timeout> = new Map()
const DEBOUNCE_MS = 300
const PROJECT_DEBOUNCE_MS = 100

export class WatcherManager {
  private watchers: Map<string, WatcherEntry> = new Map()
  private win: BrowserWindow | null = null

  setWindow(win: BrowserWindow | null) {
    this.win = win
  }

  private sendChangeEvent(event: DirectoryChangeEvent) {
    if (!this.win || this.win.isDestroyed()) return

    // Debounce by directory type
    const existingTimer = debounceTimers.get(event.directory)
    if (existingTimer) {
      clearTimeout(existingTimer)
    }

    debounceTimers.set(
      event.directory,
      setTimeout(() => {
        const channelName = `directory:${event.directory}-changed`
        this.win?.webContents.send(channelName, event)
        debounceTimers.delete(event.directory)
      }, DEBOUNCE_MS)
    )
  }

  private createWatcher(
    paths: string | string[],
    type: DirectoryType,
    key: string
  ): chokidar.FSWatcher {
    const watcher = chokidar.watch(paths, {
      ignoreInitial: true,
      depth: 2, // Watch nested directories but not too deep
      awaitWriteFinish: {
        stabilityThreshold: 100,
        pollInterval: 50,
      },
    })

    watcher
      .on('add', (filePath) => {
        this.sendChangeEvent({ directory: type, eventType: 'add', path: filePath })
      })
      .on('change', (filePath) => {
        this.sendChangeEvent({ directory: type, eventType: 'change', path: filePath })
      })
      .on('unlink', (filePath) => {
        this.sendChangeEvent({ directory: type, eventType: 'unlink', path: filePath })
      })
      .on('addDir', (dirPath) => {
        this.sendChangeEvent({ directory: type, eventType: 'add', path: dirPath })
      })
      .on('unlinkDir', (dirPath) => {
        this.sendChangeEvent({ directory: type, eventType: 'unlink', path: dirPath })
      })
      .on('error', (error) => {
        console.error(`Watcher error for ${type}:`, error)
      })

    this.watchers.set(key, { watcher, type })
    return watcher
  }

  startProjectsWatcher(): void {
    const key = 'projects'
    if (this.watchers.has(key)) return

    const userDataPath = app.getPath('userData')
    const projectsPath = path.join(userDataPath, 'projects')

    try {
      this.createWatcher(projectsPath, 'projects', key)
      console.log('Started projects watcher:', projectsPath)
    } catch (error) {
      console.error('Failed to start projects watcher:', error)
    }
  }

  startBuildsWatcher(): void {
    const key = 'builds'
    if (this.watchers.has(key)) return

    const userDataPath = app.getPath('userData')
    const buildsPluginsPath = path.join(userDataPath, 'builds', 'plugins')
    const buildsPacksPath = path.join(userDataPath, 'builds', 'packs')

    try {
      this.createWatcher([buildsPluginsPath, buildsPacksPath], 'builds', key)
      console.log('Started builds watcher:', buildsPluginsPath, buildsPacksPath)
    } catch (error) {
      console.error('Failed to start builds watcher:', error)
    }
  }

  startModsWatcher(modsPath: string | null, packsPath: string | null, earlyPluginsPath: string | null): void {
    const key = 'mods'

    // Stop existing mods watcher if any
    this.stopModsWatcher()

    const paths = [modsPath, packsPath, earlyPluginsPath].filter((p): p is string => !!p)
    if (paths.length === 0) {
      console.log('No mods paths to watch')
      return
    }

    try {
      this.createWatcher(paths, 'mods', key)
      console.log('Started mods watcher:', paths)
    } catch (error) {
      console.error('Failed to start mods watcher:', error)
    }
  }

  stopModsWatcher(): void {
    const key = 'mods'
    const entry = this.watchers.get(key)
    if (entry) {
      entry.watcher.close()
      this.watchers.delete(key)
      console.log('Stopped mods watcher')
    }
  }

  // Active project watcher - watches a specific project for file changes
  private projectDebounceTimer: NodeJS.Timeout | null = null

  private determineChangeType(filename: string): FileChangeType {
    if (filename.endsWith('.java')) {
      return 'java'
    } else if (filename === 'manifest.json' || filename.endsWith('manifest.json')) {
      return 'manifest'
    } else if (filename.includes('Server') && filename.endsWith('.json')) {
      return 'asset'
    }
    return 'other'
  }

  private sendProjectFileChange(projectPath: string, filePath: string, relativePath: string, eventType: 'rename' | 'change') {
    if (!this.win || this.win.isDestroyed()) return

    const changeType = this.determineChangeType(relativePath)

    // Debounce rapid changes
    if (this.projectDebounceTimer) {
      clearTimeout(this.projectDebounceTimer)
    }

    this.projectDebounceTimer = setTimeout(() => {
      const event: FileChangeEvent = {
        projectPath,
        filePath,
        relativePath,
        eventType,
        changeType,
      }
      this.win?.webContents.send('project:file-changed', event)
      this.projectDebounceTimer = null
    }, PROJECT_DEBOUNCE_MS)
  }

  startActiveProjectWatcher(projectPath: string): { success: boolean; error?: string } {
    // Stop existing active project watcher if any
    this.stopActiveProjectWatcher()

    const key = 'active-project'

    try {
      const watcher = chokidar.watch(projectPath, {
        ignoreInitial: true,
        awaitWriteFinish: {
          stabilityThreshold: 100,
          pollInterval: 50,
        },
      })

      watcher
        .on('add', (filePath) => {
          const relativePath = path.relative(projectPath, filePath)
          this.sendProjectFileChange(projectPath, filePath, relativePath, 'rename')
        })
        .on('change', (filePath) => {
          const relativePath = path.relative(projectPath, filePath)
          this.sendProjectFileChange(projectPath, filePath, relativePath, 'change')
        })
        .on('unlink', (filePath) => {
          const relativePath = path.relative(projectPath, filePath)
          this.sendProjectFileChange(projectPath, filePath, relativePath, 'rename')
        })
        .on('error', (error) => {
          console.error('Active project watcher error:', error)
          this.stopActiveProjectWatcher()
        })

      this.watchers.set(key, { watcher, type: 'active-project' })
      console.log('Started active project watcher:', projectPath)
      return { success: true }
    } catch (error) {
      console.error('Failed to start active project watcher:', error)
      return { success: false, error: String(error) }
    }
  }

  stopActiveProjectWatcher(): { success: boolean } {
    const key = 'active-project'

    if (this.projectDebounceTimer) {
      clearTimeout(this.projectDebounceTimer)
      this.projectDebounceTimer = null
    }

    const entry = this.watchers.get(key)
    if (entry) {
      entry.watcher.close()
      this.watchers.delete(key)
      console.log('Stopped active project watcher')
    }

    return { success: true }
  }

  stopAllWatchers(): void {
    // Clear all debounce timers
    for (const timer of debounceTimers.values()) {
      clearTimeout(timer)
    }
    debounceTimers.clear()

    // Close all watchers
    for (const [key, entry] of this.watchers) {
      entry.watcher.close()
      console.log(`Stopped ${key} watcher`)
    }
    this.watchers.clear()
  }
}

// Singleton instance
export const watcherManager = new WatcherManager()
