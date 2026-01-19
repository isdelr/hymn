import { renderHook, waitFor, act } from '@testing-library/react'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { useToggleMod, useDeleteMod, useAddMods } from '@/hooks/mutations/useModMutations'
import {
  createFixtures,
  buildHymnApi,
  buildHymnFileWatcherApi,
  createWrapper,
} from '../../test-utils'
import type { ModEntry } from '@/shared/hymn-types'

// Mock sonner toast
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}))

import { toast } from 'sonner'

describe('useModMutations', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    buildHymnFileWatcherApi()
  })

  describe('useToggleMod', () => {
    it('calls setModEnabled with correct parameters', async () => {
      const fixtures = createFixtures()
      const setModEnabled = vi.fn().mockResolvedValue({ success: true })
      buildHymnApi(fixtures, { setModEnabled })

      const { result } = renderHook(() => useToggleMod(), {
        wrapper: createWrapper(),
      })

      const entry: ModEntry = fixtures.entries[0]

      await act(async () => {
        result.current.mutate({ worldId: 'test-world', entry, enabled: false })
      })

      await waitFor(() => {
        expect(setModEnabled).toHaveBeenCalledWith({
          worldId: 'test-world',
          modId: entry.id,
          enabled: false,
        })
      })
    })

    it('shows error toast on failure', async () => {
      const fixtures = createFixtures()
      const setModEnabled = vi.fn().mockRejectedValue(new Error('Toggle failed'))
      buildHymnApi(fixtures, { setModEnabled })

      const { result } = renderHook(() => useToggleMod(), {
        wrapper: createWrapper(),
      })

      const entry: ModEntry = fixtures.entries[0]

      await act(async () => {
        result.current.mutate({ worldId: 'test-world', entry, enabled: false })
      })

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Toggle failed')
      })
    })

    it('shows generic error message for non-Error exceptions', async () => {
      const fixtures = createFixtures()
      const setModEnabled = vi.fn().mockRejectedValue('Unknown error')
      buildHymnApi(fixtures, { setModEnabled })

      const { result } = renderHook(() => useToggleMod(), {
        wrapper: createWrapper(),
      })

      const entry: ModEntry = fixtures.entries[0]

      await act(async () => {
        result.current.mutate({ worldId: 'test-world', entry, enabled: false })
      })

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Unable to toggle mod.')
      })
    })
  })

  describe('useDeleteMod', () => {
    it('calls deleteMod with correct parameters', async () => {
      const fixtures = createFixtures()
      const deleteMod = vi.fn().mockResolvedValue({
        success: true,
        backupPath: 'C:\\backup\\path',
      })
      buildHymnApi(fixtures, { deleteMod })

      const { result } = renderHook(() => useDeleteMod(), {
        wrapper: createWrapper(),
      })

      const entry: ModEntry = fixtures.entries[0]

      await act(async () => {
        result.current.mutate({ entry, worldId: 'test-world' })
      })

      await waitFor(() => {
        expect(deleteMod).toHaveBeenCalledWith({
          modId: entry.id,
          modPath: entry.path,
        })
      })
    })

    it('shows success toast on successful deletion', async () => {
      const fixtures = createFixtures()
      const deleteMod = vi.fn().mockResolvedValue({ success: true })
      buildHymnApi(fixtures, { deleteMod })

      const { result } = renderHook(() => useDeleteMod(), {
        wrapper: createWrapper(),
      })

      const entry: ModEntry = fixtures.entries[0]

      await act(async () => {
        result.current.mutate({ entry, worldId: 'test-world' })
      })

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith('Mod deleted')
      })
    })

    it('shows error toast on failure', async () => {
      const fixtures = createFixtures()
      const deleteMod = vi.fn().mockRejectedValue(new Error('Delete failed'))
      buildHymnApi(fixtures, { deleteMod })

      const { result } = renderHook(() => useDeleteMod(), {
        wrapper: createWrapper(),
      })

      const entry: ModEntry = fixtures.entries[0]

      await act(async () => {
        result.current.mutate({ entry, worldId: 'test-world' })
      })

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Delete failed')
      })
    })
  })

  describe('useAddMods', () => {
    it('calls addMods API', async () => {
      const fixtures = createFixtures()
      const addMods = vi.fn().mockResolvedValue({
        success: true,
        addedPaths: ['C:\\path\\to\\mod.zip'],
      })
      buildHymnApi(fixtures, { addMods })

      const { result } = renderHook(() => useAddMods(), {
        wrapper: createWrapper(),
      })

      await act(async () => {
        result.current.mutate('test-world')
      })

      await waitFor(() => {
        expect(addMods).toHaveBeenCalled()
      })
    })

    it('shows success toast on successful add', async () => {
      const fixtures = createFixtures()
      const addMods = vi.fn().mockResolvedValue({
        success: true,
        addedPaths: ['C:\\path\\to\\mod.zip'],
      })
      buildHymnApi(fixtures, { addMods })

      const { result } = renderHook(() => useAddMods(), {
        wrapper: createWrapper(),
      })

      await act(async () => {
        result.current.mutate('test-world')
      })

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith('Mods added')
      })
    })

    it('does not show error when user cancels', async () => {
      const fixtures = createFixtures()
      const addMods = vi.fn().mockRejectedValue(new Error('Operation cancelled'))
      buildHymnApi(fixtures, { addMods })

      const { result } = renderHook(() => useAddMods(), {
        wrapper: createWrapper(),
      })

      await act(async () => {
        result.current.mutate('test-world')
      })

      await waitFor(() => {
        expect(addMods).toHaveBeenCalled()
      })

      // Should not show error toast for cancelled operations
      expect(toast.error).not.toHaveBeenCalled()
    })

    it('shows error toast on non-cancel failure', async () => {
      const fixtures = createFixtures()
      const addMods = vi.fn().mockRejectedValue(new Error('File access denied'))
      buildHymnApi(fixtures, { addMods })

      const { result } = renderHook(() => useAddMods(), {
        wrapper: createWrapper(),
      })

      await act(async () => {
        result.current.mutate('test-world')
      })

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('File access denied')
      })
    })
  })
})
