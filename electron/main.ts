import { app, BrowserWindow, globalShortcut, Menu, nativeTheme, session, shell } from 'electron'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { readSetting, SETTINGS_KEYS } from './core/database'
import { loadInstallPathOverride } from './services/InstallService'
import { loadProfileSettings, ensureDefaultProfile } from './services/ProfileService'
import { initializeUpdater, cleanupUpdater } from './services/UpdateService'
import { registerAllIpcHandlers, shouldForceClose, resetForceClose } from './ipc'
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
// - 'unsafe-eval' in dev: Required for Vite HMR
// - 'unsafe-inline' for scripts in dev: Required for Vite's inline script injection
// - 'unsafe-inline' for styles: Required for Tailwind CSS
// - 'img-src https:' is intentionally broad to allow mod icons/images from external sources
// - connect-src localhost in dev: Required for Vite dev server communication
const DEVELOPMENT_CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-eval' 'unsafe-inline' blob:",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: https:",
  "font-src 'self' data:",
  "connect-src 'self' ws://localhost:* http://localhost:*",
  "worker-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join('; ')

// Production CSP removes unsafe-eval and adds hardening directives
// Note: connect-src includes GitHub for auto-update status communication
const PRODUCTION_CSP = [
  "default-src 'self'",
  "script-src 'self' blob:",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: https:",
  "font-src 'self' data:",
  "connect-src 'self' https://api.github.com https://github.com",
  "worker-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "upgrade-insecure-requests",
  "block-all-mixed-content",
].join('; ')

// Allowed domains for external links opened via shell.openExternal()
// Note: Backend fetches (e.g., Gradle downloads from services.gradle.org) bypass CSP
// as they occur in the main process, not the renderer
const ALLOWED_EXTERNAL_DOMAINS = new Set([
  'github.com',        // JDK downloads, project links
  'hytale.com',        // Hytale download link in Settings
  'hypixelstudios.com', // Official Hytale developer
  'discord.gg',        // Community links
  'discord.com',       // Community links
  'docs.hytale.com',   // Hytale documentation
])

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
 * Set up a minimal application menu.
 * On macOS, keeps essential app menu items. On other platforms, removes menu entirely.
 */
function setupMenu(): void {
  const isMac = process.platform === 'darwin'

  if (isMac) {
    // macOS requires at least an app menu for standard keyboard shortcuts to work
    const template: Electron.MenuItemConstructorOptions[] = [
      {
        label: app.name,
        submenu: [
          { role: 'about' },
          { type: 'separator' },
          { role: 'hide' },
          { role: 'hideOthers' },
          { role: 'unhide' },
          { type: 'separator' },
          { role: 'quit' },
        ],
      },
      {
        label: 'Edit',
        submenu: [
          { role: 'undo' },
          { role: 'redo' },
          { type: 'separator' },
          { role: 'cut' },
          { role: 'copy' },
          { role: 'paste' },
          { role: 'selectAll' },
        ],
      },
      {
        label: 'Window',
        submenu: [
          { role: 'minimize' },
          { role: 'zoom' },
          { type: 'separator' },
          { role: 'front' },
        ],
      },
    ]
    Menu.setApplicationMenu(Menu.buildFromTemplate(template))
  } else {
    // On Windows/Linux, remove the menu entirely
    Menu.setApplicationMenu(null)
  }
}

// Theme colors for title bar background
const THEME_COLORS = {
  dark: '#1a1b26',
  light: '#ffffff',
}

/**
 * Get the appropriate background color based on current theme.
 */
function getBackgroundColor(): string {
  return nativeTheme.shouldUseDarkColors ? THEME_COLORS.dark : THEME_COLORS.light
}

/**
 * Create the main browser window.
 */
function createWindow(): void {
  const isLinux = process.platform === 'linux'

  win = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 800,
    minHeight: 600,
    icon: path.join(process.env.VITE_PUBLIC, 'icon.png'),
    // Set background color for title bar on macOS and Windows (Linux uses system theming)
    backgroundColor: isLinux ? undefined : getBackgroundColor(),
    webPreferences: {
      preload: path.join(__dirname, 'preload.mjs'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      allowRunningInsecureContent: false,
      experimentalFeatures: false,
      enableBlinkFeatures: '',
      devTools: !app.isPackaged,
    },
  })

  // Update title bar background color when theme changes (macOS/Windows only)
  if (!isLinux) {
    nativeTheme.on('updated', () => {
      win?.setBackgroundColor(getBackgroundColor())
    })
  }

  // Set up watcher manager with window reference
  watcherManager.setWindow(win)

  // Forward maximize state changes to renderer
  win.on('maximize', () => {
    win?.webContents.send('window:maximized', true)
  })
  win.on('unmaximize', () => {
    win?.webContents.send('window:maximized', false)
  })

  // Handle close event - check for unsaved changes via IPC
  win.on('close', (event) => {
    if (shouldForceClose()) {
      // Force close was requested, allow the window to close
      resetForceClose()
      return
    }
    if (win) {
      event.preventDefault()
      win.webContents.send('window:close-requested')

      // Failsafe: if renderer doesn't respond within 3 seconds, force close
      // This handles cases where the renderer is broken or unresponsive
      setTimeout(() => {
        if (win && !shouldForceClose()) {
          console.warn('Renderer did not respond to close request, forcing close')
          win.destroy()
        }
      }, 3000)
    }
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
      try {
        const parsedUrl = new URL(url)
        const hostname = parsedUrl.hostname

        // Check if domain or parent domain is in allowlist
        const isAllowed = ALLOWED_EXTERNAL_DOMAINS.has(hostname) ||
          Array.from(ALLOWED_EXTERNAL_DOMAINS).some(
            (domain) => hostname.endsWith(`.${domain}`)
          )

        if (isAllowed) {
          shell.openExternal(url)
        } else {
          console.warn(`Blocked external link to unallowed domain: ${hostname}`)
        }
      } catch {
        console.warn(`Invalid URL blocked: ${url}`)
      }
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
    setupMenu()
    createWindow()

    // Initialize auto-updater
    initializeUpdater()

    // Register DevTools shortcut in development only
    if (!app.isPackaged) {
      globalShortcut.register('CommandOrControl+Shift+I', () => {
        win?.webContents.toggleDevTools()
      })
    }
  })

  // Quit when all windows are closed
  app.on('window-all-closed', () => {
    watcherManager.stopAllWatchers()
    cleanupUpdater()
    globalShortcut.unregisterAll()
    app.quit()
    win = null
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
