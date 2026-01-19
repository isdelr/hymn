import { describe, expect, it, beforeEach } from 'vitest'
import { useAppStore } from '@/stores/appStore'

describe('appStore', () => {
  beforeEach(() => {
    // Reset store state before each test
    useAppStore.setState({ selectedWorldId: null })
  })

  describe('initial state', () => {
    it('has null selectedWorldId', () => {
      expect(useAppStore.getState().selectedWorldId).toBeNull()
    })
  })

  describe('setSelectedWorldId', () => {
    it('updates selectedWorldId to a string value', () => {
      const store = useAppStore.getState()
      store.setSelectedWorldId('world-123')

      expect(useAppStore.getState().selectedWorldId).toBe('world-123')
    })

    it('updates selectedWorldId to null', () => {
      const store = useAppStore.getState()
      store.setSelectedWorldId('world-123')
      expect(useAppStore.getState().selectedWorldId).toBe('world-123')

      store.setSelectedWorldId(null)
      expect(useAppStore.getState().selectedWorldId).toBeNull()
    })

    it('can change between different world IDs', () => {
      const store = useAppStore.getState()

      store.setSelectedWorldId('world-1')
      expect(useAppStore.getState().selectedWorldId).toBe('world-1')

      store.setSelectedWorldId('world-2')
      expect(useAppStore.getState().selectedWorldId).toBe('world-2')

      store.setSelectedWorldId('world-3')
      expect(useAppStore.getState().selectedWorldId).toBe('world-3')
    })
  })
})
