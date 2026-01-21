import { BrowserWindow, app } from 'electron'
import { autoUpdater, UpdateInfo as ElectronUpdateInfo } from 'electron-updater'
import type { UpdateInfo, UpdateStatus, UpdateProgress } from '../../src/shared/hymn-types'

// Module-level state
let currentInfo: UpdateInfo = {
  status: 'idle',
  version: null,
  releaseNotes: null,
  progress: null,
  error: null,
}

let checkInterval: NodeJS.Timeout | null = null
const CHECK_INTERVAL_MS = 4 * 60 * 60 * 1000 // 4 hours
const INITIAL_CHECK_DELAY_MS = 10 * 1000 // 10 seconds

/**
 * Send update status to renderer process
 */
function broadcastStatus(): void {
  const win = BrowserWindow.getAllWindows()[0]
  if (win && !win.isDestroyed()) {
    win.webContents.send('update:status-changed', currentInfo)
  }
}

/**
 * Update the current status and broadcast to renderer
 */
function setStatus(status: UpdateStatus, updates?: Partial<UpdateInfo>): void {
  currentInfo = {
    ...currentInfo,
    status,
    ...updates,
  }
  broadcastStatus()
}

/**
 * Configure and initialize the auto-updater
 */
export function initializeUpdater(): void {
  // Configure auto-updater
  autoUpdater.autoDownload = false
  autoUpdater.autoInstallOnAppQuit = true

  // In development, we can test with a local update server or skip updates
  if (!app.isPackaged) {
    // For development testing, you can set forceDevUpdateConfig = true
    // and provide a dev-app-update.yml file
    autoUpdater.forceDevUpdateConfig = false
  }

  // Event handlers
  autoUpdater.on('checking-for-update', () => {
    setStatus('checking', {
      error: null,
    })
  })

  autoUpdater.on('update-available', (info: ElectronUpdateInfo) => {
    // Extract release notes - could be string or array of release notes
    let releaseNotes: string | null = null
    if (info.releaseNotes) {
      if (typeof info.releaseNotes === 'string') {
        releaseNotes = info.releaseNotes
      } else if (Array.isArray(info.releaseNotes)) {
        releaseNotes = info.releaseNotes
          .map((note) => (typeof note === 'string' ? note : note.note))
          .join('\n\n')
      }
    }

    setStatus('available', {
      version: info.version,
      releaseNotes,
      error: null,
    })
  })

  autoUpdater.on('update-not-available', () => {
    setStatus('not-available', {
      error: null,
    })
  })

  autoUpdater.on('download-progress', (progressObj) => {
    const progress: UpdateProgress = {
      bytesPerSecond: progressObj.bytesPerSecond,
      percent: progressObj.percent,
      transferred: progressObj.transferred,
      total: progressObj.total,
    }
    setStatus('downloading', {
      progress,
      error: null,
    })
  })

  autoUpdater.on('update-downloaded', (info: ElectronUpdateInfo) => {
    setStatus('downloaded', {
      version: info.version,
      progress: null,
      error: null,
    })
  })

  autoUpdater.on('error', (err: Error) => {
    setStatus('error', {
      error: err.message || 'An error occurred during update',
      progress: null,
    })
  })

  // Start periodic checks (only in production)
  if (app.isPackaged) {
    // Initial check after delay
    setTimeout(() => {
      checkForUpdates().catch(console.error)
    }, INITIAL_CHECK_DELAY_MS)

    // Periodic checks
    checkInterval = setInterval(() => {
      checkForUpdates().catch(console.error)
    }, CHECK_INTERVAL_MS)
  }
}

/**
 * Clean up updater resources
 */
export function cleanupUpdater(): void {
  if (checkInterval) {
    clearInterval(checkInterval)
    checkInterval = null
  }
}

/**
 * Get current update info
 */
export function getUpdateInfo(): UpdateInfo {
  return { ...currentInfo }
}

/**
 * Check for updates
 */
export async function checkForUpdates(): Promise<UpdateInfo> {
  try {
    await autoUpdater.checkForUpdates()
    return getUpdateInfo()
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to check for updates'
    setStatus('error', { error: errorMessage })
    return getUpdateInfo()
  }
}

/**
 * Download the available update
 */
export async function downloadUpdate(): Promise<void> {
  if (currentInfo.status !== 'available') {
    throw new Error('No update available to download')
  }
  await autoUpdater.downloadUpdate()
}

/**
 * Quit the app and install the downloaded update silently
 */
export function installUpdate(): void {
  if (currentInfo.status !== 'downloaded') {
    throw new Error('No update downloaded to install')
  }

  setImmediate(() => {
    app.removeAllListeners('window-all-closed')
    // isSilent=true, isForceRunAfter=true
    autoUpdater.quitAndInstall(true, true)
  })
}

/**
 * Download and install update in one action (for one-click UX)
 */
export async function downloadAndInstall(): Promise<void> {
  if (currentInfo.status === 'downloaded') {
    installUpdate()
    return
  }

  if (currentInfo.status !== 'available') {
    throw new Error('No update available')
  }

  autoUpdater.once('update-downloaded', () => {
    setTimeout(() => installUpdate(), 500)
  })

  await autoUpdater.downloadUpdate()
}
