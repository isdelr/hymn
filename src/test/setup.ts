import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach, vi } from 'vitest'
import { QueryClient } from '@tanstack/react-query'

afterEach(() => {
  cleanup()
})

// Mock Electron preload APIs
if (!window.hymnTheme) {
  window.hymnTheme = {
    get: vi.fn().mockResolvedValue(false),
    set: vi.fn().mockResolvedValue(undefined),
    onChange: vi.fn().mockReturnValue(() => {}),
  }
}

if (!window.hymnSettings) {
  window.hymnSettings = {
    getTheme: vi.fn().mockResolvedValue('system'),
    setTheme: vi.fn().mockResolvedValue(undefined),
    getModSortOrder: vi.fn().mockResolvedValue('name'),
    setModSortOrder: vi.fn().mockResolvedValue(undefined),
    getDefaultExportPath: vi.fn().mockResolvedValue(null),
    setDefaultExportPath: vi.fn().mockResolvedValue(undefined),
    selectDefaultExportPath: vi.fn().mockResolvedValue(null),
    getJdkPath: vi.fn().mockResolvedValue(null),
    setJdkPath: vi.fn().mockResolvedValue(undefined),
    selectJdkPath: vi.fn().mockResolvedValue(null),
    getManagedJdkPath: vi.fn().mockResolvedValue(null),
    downloadJdk: vi.fn().mockResolvedValue({ success: true, jdkPath: '/path/to/jdk', version: '25' }),
    cancelJdkDownload: vi.fn().mockResolvedValue(undefined),
    onJdkDownloadProgress: vi.fn().mockReturnValue(() => {}),
    getServerJarPath: vi.fn().mockResolvedValue(null),
    setServerJarPath: vi.fn().mockResolvedValue(undefined),
    selectServerJarPath: vi.fn().mockResolvedValue(null),
    getGradleVersion: vi.fn().mockResolvedValue('9.3.0'),
    setGradleVersion: vi.fn().mockResolvedValue(undefined),
    getAppVersion: vi.fn().mockResolvedValue('0.0.0-dev'),
  }
}

if (!window.hymnWindow) {
  window.hymnWindow = {
    minimize: vi.fn().mockResolvedValue(undefined),
    maximize: vi.fn().mockResolvedValue(undefined),
    close: vi.fn().mockResolvedValue(undefined),
    forceClose: vi.fn().mockResolvedValue(undefined),
    isMaximized: vi.fn().mockResolvedValue(false),
    onMaximizedChange: vi.fn().mockReturnValue(() => {}),
    onCloseRequested: vi.fn().mockReturnValue(() => {}),
    getPlatform: vi.fn().mockReturnValue('win32'),
  }
}

if (!window.matchMedia) {
  const listeners = new Set<EventListenerOrEventListenerObject>()
  window.matchMedia = (query: string): MediaQueryList => {
    return {
      matches: window.innerWidth <= 767,
      media: query,
      onchange: null,
      addEventListener: (_event: string, listener: EventListenerOrEventListenerObject) => {
        listeners.add(listener)
      },
      removeEventListener: (_event: string, listener: EventListenerOrEventListenerObject) => {
        listeners.delete(listener)
      },
      addListener: (listener: ((this: MediaQueryList, ev: MediaQueryListEvent) => void) | null) => {
        if (listener) {
          listeners.add(listener as EventListenerOrEventListenerObject)
        }
      },
      removeListener: (listener: ((this: MediaQueryList, ev: MediaQueryListEvent) => void) | null) => {
        if (listener) {
          listeners.delete(listener as EventListenerOrEventListenerObject)
        }
      },
      dispatchEvent: (event: Event) => {
        listeners.forEach((listener) => {
          if (typeof listener === 'function') {
            listener(event)
          } else {
            listener.handleEvent(event)
          }
        })
        return true
      },
    }
  }
}

if (!window.ResizeObserver) {
  window.ResizeObserver = class ResizeObserver {
    observe = vi.fn()
    unobserve = vi.fn()
    disconnect = vi.fn()
  }
}

// React Query test utilities
export function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
        staleTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  })
}
