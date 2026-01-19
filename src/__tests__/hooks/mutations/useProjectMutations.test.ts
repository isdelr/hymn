import { renderHook, waitFor, act } from '@testing-library/react'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { useCreatePack, useCreatePlugin, useDeleteProject } from '@/hooks/mutations/useProjectMutations'
import {
  createFixtures,
  buildHymnApi,
  buildHymnFileWatcherApi,
  createWrapper,
} from '../../test-utils'

// Mock sonner toast
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}))

import { toast } from 'sonner'

describe('useProjectMutations', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    buildHymnFileWatcherApi()
  })

  describe('useCreatePack', () => {
    it('calls createPack API with correct options', async () => {
      const fixtures = createFixtures()
      const createPack = vi.fn().mockResolvedValue({
        success: true,
        path: 'C:\\Hytale\\packs\\MyPack',
        manifestPath: 'C:\\Hytale\\packs\\MyPack\\manifest.json',
      })
      buildHymnApi(fixtures, { createPack })

      const { result } = renderHook(() => useCreatePack(), {
        wrapper: createWrapper(),
      })

      await act(async () => {
        result.current.mutate({
          name: 'MyPack',
          description: 'Test pack',
          version: '1.0.0',
          authorName: 'Test Author',
          location: 'packs',
        })
      })

      await waitFor(() => {
        expect(createPack).toHaveBeenCalledWith({
          name: 'MyPack',
          description: 'Test pack',
          version: '1.0.0',
          authorName: 'Test Author',
          location: 'packs',
        })
      })
    })

    it('shows success toast on successful creation', async () => {
      const fixtures = createFixtures()
      const createPack = vi.fn().mockResolvedValue({
        success: true,
        path: 'C:\\Hytale\\packs\\MyPack',
      })
      buildHymnApi(fixtures, { createPack })

      const { result } = renderHook(() => useCreatePack(), {
        wrapper: createWrapper(),
      })

      await act(async () => {
        result.current.mutate({
          name: 'MyPack',
          description: 'Test pack',
          version: '1.0.0',
          authorName: 'Test Author',
          location: 'packs',
        })
      })

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith('Pack created!')
      })
    })

    it('shows error toast on failure', async () => {
      const fixtures = createFixtures()
      const createPack = vi.fn().mockRejectedValue(new Error('Creation failed'))
      buildHymnApi(fixtures, { createPack })

      const { result } = renderHook(() => useCreatePack(), {
        wrapper: createWrapper(),
      })

      await act(async () => {
        result.current.mutate({
          name: 'MyPack',
          description: 'Test pack',
          version: '1.0.0',
          authorName: 'Test Author',
          location: 'packs',
        })
      })

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Failed to create pack')
      })
    })
  })

  describe('useCreatePlugin', () => {
    it('calls createPlugin API with correct options', async () => {
      const fixtures = createFixtures()
      const createPlugin = vi.fn().mockResolvedValue({
        success: true,
        path: 'C:\\Hytale\\plugins\\MyPlugin',
        manifestPath: 'C:\\Hytale\\plugins\\MyPlugin\\src\\main\\resources\\manifest.json',
        mainClassPath: 'C:\\Hytale\\plugins\\MyPlugin\\src\\main\\java\\com\\example\\MyPlugin.java',
      })
      buildHymnApi(fixtures, { createPlugin })

      const { result } = renderHook(() => useCreatePlugin(), {
        wrapper: createWrapper(),
      })

      await act(async () => {
        result.current.mutate({
          name: 'MyPlugin',
          description: 'Test plugin',
          version: '1.0.0',
          authorName: 'Test Author',
          group: 'com.example',
        })
      })

      await waitFor(() => {
        expect(createPlugin).toHaveBeenCalledWith({
          name: 'MyPlugin',
          description: 'Test plugin',
          version: '1.0.0',
          authorName: 'Test Author',
          group: 'com.example',
        })
      })
    })

    it('shows success toast on successful creation', async () => {
      const fixtures = createFixtures()
      const createPlugin = vi.fn().mockResolvedValue({
        success: true,
        path: 'C:\\Hytale\\plugins\\MyPlugin',
      })
      buildHymnApi(fixtures, { createPlugin })

      const { result } = renderHook(() => useCreatePlugin(), {
        wrapper: createWrapper(),
      })

      await act(async () => {
        result.current.mutate({
          name: 'MyPlugin',
          description: 'Test plugin',
          version: '1.0.0',
          authorName: 'Test Author',
          group: 'com.example',
        })
      })

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith('Plugin created!')
      })
    })

    it('shows error toast on failure', async () => {
      const fixtures = createFixtures()
      const createPlugin = vi.fn().mockRejectedValue(new Error('Creation failed'))
      buildHymnApi(fixtures, { createPlugin })

      const { result } = renderHook(() => useCreatePlugin(), {
        wrapper: createWrapper(),
      })

      await act(async () => {
        result.current.mutate({
          name: 'MyPlugin',
          description: 'Test plugin',
          version: '1.0.0',
          authorName: 'Test Author',
          group: 'com.example',
        })
      })

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Failed to create plugin')
      })
    })
  })

  describe('useDeleteProject', () => {
    it('calls deleteProject API with correct options', async () => {
      const fixtures = createFixtures()
      const deleteProject = vi.fn().mockResolvedValue({ success: true })
      buildHymnApi(fixtures, { deleteProject })

      const { result } = renderHook(() => useDeleteProject(), {
        wrapper: createWrapper(),
      })

      await act(async () => {
        result.current.mutate({ projectPath: 'C:\\Hytale\\projects\\MyProject' })
      })

      await waitFor(() => {
        expect(deleteProject).toHaveBeenCalledWith({
          projectPath: 'C:\\Hytale\\projects\\MyProject',
        })
      })
    })

    it('shows success toast on successful deletion', async () => {
      const fixtures = createFixtures()
      const deleteProject = vi.fn().mockResolvedValue({ success: true })
      buildHymnApi(fixtures, { deleteProject })

      const { result } = renderHook(() => useDeleteProject(), {
        wrapper: createWrapper(),
      })

      await act(async () => {
        result.current.mutate({ projectPath: 'C:\\Hytale\\projects\\MyProject' })
      })

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith('Project deleted')
      })
    })

    it('shows error toast when deletion returns error', async () => {
      const fixtures = createFixtures()
      const deleteProject = vi.fn().mockResolvedValue({
        success: false,
        error: 'Project is locked',
      })
      buildHymnApi(fixtures, { deleteProject })

      const { result } = renderHook(() => useDeleteProject(), {
        wrapper: createWrapper(),
      })

      await act(async () => {
        result.current.mutate({ projectPath: 'C:\\Hytale\\projects\\MyProject' })
      })

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Project is locked')
      })
    })

    it('shows error toast on API rejection', async () => {
      const fixtures = createFixtures()
      const deleteProject = vi.fn().mockRejectedValue(new Error('Network error'))
      buildHymnApi(fixtures, { deleteProject })

      const { result } = renderHook(() => useDeleteProject(), {
        wrapper: createWrapper(),
      })

      await act(async () => {
        result.current.mutate({ projectPath: 'C:\\Hytale\\projects\\MyProject' })
      })

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Network error')
      })
    })

    it('shows generic error when success is false without error message', async () => {
      const fixtures = createFixtures()
      const deleteProject = vi.fn().mockResolvedValue({ success: false })
      buildHymnApi(fixtures, { deleteProject })

      const { result } = renderHook(() => useDeleteProject(), {
        wrapper: createWrapper(),
      })

      await act(async () => {
        result.current.mutate({ projectPath: 'C:\\Hytale\\projects\\MyProject' })
      })

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Failed to delete project')
      })
    })
  })
})
