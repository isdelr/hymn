import { app, BrowserWindow, nativeTheme, session, shell } from 'electron'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { readSetting, SETTINGS_KEYS } from './core/database'
import { loadInstallPathOverride } from './services/InstallService'
import { loadProfileSettings, ensureDefaultProfile } from './services/ProfileService'
import { registerAllIpcHandlers } from './ipc'
import { watcherManager } from './fileWatchers'
import type { ThemeMode } from '../src/shared/hymn-types'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// App constants
process.env.APP_ROOT = path.join(__dirname, '..')
export const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL']
export const MAIN_DIST = path.join(process.env.APP_ROOT, 'dist-electron')
export const RENDERER_DIST = path.join(process.env.APP_ROOT, 'dist')
process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL
  ? path.join(process.env.APP_ROOT, 'public')
  : RENDERER_DIST

// Window reference
let win: BrowserWindow | null = null

// Content Security Policy configuration
const DEVELOPMENT_CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-eval'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: https:",
  "font-src 'self' data:",
  "connect-src 'self' ws://localhost:* http://localhost:*",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join('; ')

const PRODUCTION_CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: https:",
  "font-src 'self' data:",
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join('; ')

/**
 * Set up Content Security Policy headers.
 */
function setupCSP(): void {
  const csp = VITE_DEV_SERVER_URL ? DEVELOPMENT_CSP : PRODUCTION_CSP
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [csp],
      },
    })
  })
}

/**
 * Set up permission handlers to deny all permission requests.
 */
function setupPermissions(): void {
  session.defaultSession.setPermissionRequestHandler((_webContents, _permission, callback) => {
    callback(false)
  })
  session.defaultSession.setPermissionCheckHandler(() => false)
}

/**
 * Create the main browser window.
 */
function createWindow(): void {
  win = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 800,
    minHeight: 600,
    frame: false,
    titleBarStyle: 'hidden',
    icon: path.join(process.env.VITE_PUBLIC, 'icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.mjs'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      allowRunningInsecureContent: false,
      experimentalFeatures: false,
      enableBlinkFeatures: '',
    },
  })

  // Set up watcher manager with window reference
  watcherManager.setWindow(win)

  // Forward maximize state changes to renderer
  win.on('maximize', () => {
    win?.webContents.send('window:maximized', true)
  })
  win.on('unmaximize', () => {
    win?.webContents.send('window:maximized', false)
  })

  // Test active push message to Renderer-process
  win.webContents.on('did-finish-load', () => {
    win?.webContents.send('main-process-message', new Date().toLocaleString())
  })

  // Restrict navigation to prevent malicious redirects
  win.webContents.on('will-navigate', (event, navigationUrl) => {
    const parsedUrl = new URL(navigationUrl)
    if (VITE_DEV_SERVER_URL) {
      const devUrl = new URL(VITE_DEV_SERVER_URL)
      if (parsedUrl.origin === devUrl.origin) return
    }
    if (parsedUrl.protocol === 'file:') return
    event.preventDefault()
  })

  // Control new window creation - open external links in browser
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https://') || url.startsWith('http://')) {
      shell.openExternal(url)
    }
    return { action: 'deny' }
  })

  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL)
  } else {
    win.loadFile(path.join(RENDERER_DIST, 'index.html'))
  }
}

/**
 * Initialize application state from database.
 */
async function initializeAppState(): Promise<void> {
  // Load persisted settings
  await loadInstallPathOverride()
  await loadProfileSettings()
  await ensureDefaultProfile()

  // Apply saved theme
  const savedTheme = (await readSetting(SETTINGS_KEYS.theme)) as ThemeMode | null
  if (savedTheme) {
    nativeTheme.themeSource = savedTheme
  }
}

/**
 * Main application entry point.
 */
async function main(): Promise<void> {
  // Initialize state before registering handlers
  await initializeAppState()

  // Register IPC handlers
  registerAllIpcHandlers(() => win)

  // Create window when ready
  app.whenReady().then(() => {
    setupCSP()
    setupPermissions()
    createWindow()
  })

  // Quit when all windows are closed (except on macOS)
  app.on('window-all-closed', () => {
    watcherManager.stopAllWatchers()
    if (process.platform !== 'darwin') {
      app.quit()
      win = null
    }
  })

  // Re-create window on macOS when clicking dock icon
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
}

// Start the application
main().catch(console.error)
