import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach, vi } from 'vitest'

afterEach(() => {
  cleanup()
})

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
      addListener: (listener: ((this: MediaQueryList, ev: MediaQueryListEvent) => any) | null) => {
        if (listener) {
          listeners.add(listener as EventListenerOrEventListenerObject)
        }
      },
      removeListener: (listener: ((this: MediaQueryList, ev: MediaQueryListEvent) => any) | null) => {
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
