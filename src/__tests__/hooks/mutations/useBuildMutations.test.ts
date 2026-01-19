import { renderHook, waitFor, act } from '@testing-library/react'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import {
  useBuildPlugin,
  useBuildPack,
  useCopyArtifactToMods,
  useDeleteBuildArtifact,
  useClearAllBuildArtifacts,
} from '@/hooks/mutations/useBuildMutations'
import {
  createFixtures,
  buildHymnApi,
  buildHymnFileWatcherApi,
  createWrapper,
  createBuildArtifact,
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

describe('useBuildMutations', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    buildHymnFileWatcherApi()
  })

  describe('useBuildPlugin', () => {
    it('shows progress toast when build starts', async () => {
      const fixtures = createFixtures()
      const buildPlugin = vi.fn().mockResolvedValue({
        success: true,
        exitCode: 0,
        output: 'Build successful',
        durationMs: 5000,
        truncated: false,
        artifact: createBuildArtifact({ artifactType: 'jar' }),
      })
      buildHymnApi(fixtures, { buildPlugin })

      const { result } = renderHook(() => useBuildPlugin(), {
        wrapper: createWrapper(),
      })

      await act(async () => {
        result.current.mutate({ projectPath: 'C:\\Hytale\\plugins\\TestPlugin' })
      })

      await waitFor(() => {
        expect(toast.info).toHaveBeenCalledWith('Building plugin...')
      })
    })

    it('calls buildPlugin API with correct options', async () => {
      const fixtures = createFixtures()
      const buildPlugin = vi.fn().mockResolvedValue({
        success: true,
        exitCode: 0,
        output: 'Build successful',
        durationMs: 5000,
        truncated: false,
        artifact: createBuildArtifact({ artifactType: 'jar' }),
      })
      buildHymnApi(fixtures, { buildPlugin })

      const { result } = renderHook(() => useBuildPlugin(), {
        wrapper: createWrapper(),
      })

      await act(async () => {
        result.current.mutate({ projectPath: 'C:\\Hytale\\plugins\\TestPlugin' })
      })

      await waitFor(() => {
        expect(buildPlugin).toHaveBeenCalledWith({
          projectPath: 'C:\\Hytale\\plugins\\TestPlugin',
        })
      })
    })

    it('shows success toast with artifact details on successful build', async () => {
      const fixtures = createFixtures()
      const artifact = createBuildArtifact({
        projectName: 'MyPlugin',
        version: '2.0.0',
        artifactType: 'jar',
      })
      const buildPlugin = vi.fn().mockResolvedValue({
        success: true,
        exitCode: 0,
        output: 'Build successful',
        durationMs: 5000,
        truncated: false,
        artifact,
      })
      buildHymnApi(fixtures, { buildPlugin })

      const { result } = renderHook(() => useBuildPlugin(), {
        wrapper: createWrapper(),
      })

      await act(async () => {
        result.current.mutate({ projectPath: 'C:\\Hytale\\plugins\\MyPlugin' })
      })

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith('Build complete! Created MyPlugin-2.0.0.jar')
      })
    })

    it('shows error toast on build failure', async () => {
      const fixtures = createFixtures()
      const buildPlugin = vi.fn().mockResolvedValue({
        success: false,
        exitCode: 1,
        output: 'Compilation error',
        durationMs: 2000,
        truncated: false,
      })
      buildHymnApi(fixtures, { buildPlugin })

      const { result } = renderHook(() => useBuildPlugin(), {
        wrapper: createWrapper(),
      })

      await act(async () => {
        result.current.mutate({ projectPath: 'C:\\Hytale\\plugins\\TestPlugin' })
      })

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Build failed. Check output for errors.')
      })
    })

    it('shows error toast on API rejection', async () => {
      const fixtures = createFixtures()
      const buildPlugin = vi.fn().mockRejectedValue(new Error('JDK not found'))
      buildHymnApi(fixtures, { buildPlugin })

      const { result } = renderHook(() => useBuildPlugin(), {
        wrapper: createWrapper(),
      })

      await act(async () => {
        result.current.mutate({ projectPath: 'C:\\Hytale\\plugins\\TestPlugin' })
      })

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('JDK not found')
      })
    })
  })

  describe('useBuildPack', () => {
    it('shows progress toast when packaging starts', async () => {
      const fixtures = createFixtures()
      const buildPack = vi.fn().mockResolvedValue({
        success: true,
        output: 'Package created',
        durationMs: 1000,
        artifact: createBuildArtifact({ artifactType: 'zip' }),
      })
      buildHymnApi(fixtures, { buildPack })

      const { result } = renderHook(() => useBuildPack(), {
        wrapper: createWrapper(),
      })

      await act(async () => {
        result.current.mutate({ projectPath: 'C:\\Hytale\\packs\\TestPack' })
      })

      await waitFor(() => {
        expect(toast.info).toHaveBeenCalledWith('Packaging asset pack...')
      })
    })

    it('calls buildPack API with correct options', async () => {
      const fixtures = createFixtures()
      const buildPack = vi.fn().mockResolvedValue({
        success: true,
        output: 'Package created',
        durationMs: 1000,
        artifact: createBuildArtifact({ artifactType: 'zip' }),
      })
      buildHymnApi(fixtures, { buildPack })

      const { result } = renderHook(() => useBuildPack(), {
        wrapper: createWrapper(),
      })

      await act(async () => {
        result.current.mutate({ projectPath: 'C:\\Hytale\\packs\\TestPack' })
      })

      await waitFor(() => {
        expect(buildPack).toHaveBeenCalledWith({
          projectPath: 'C:\\Hytale\\packs\\TestPack',
        })
      })
    })

    it('shows success toast with artifact details', async () => {
      const fixtures = createFixtures()
      const artifact = createBuildArtifact({
        projectName: 'MyPack',
        version: '3.0.0',
        artifactType: 'zip',
      })
      const buildPack = vi.fn().mockResolvedValue({
        success: true,
        output: 'Package created',
        durationMs: 1000,
        artifact,
      })
      buildHymnApi(fixtures, { buildPack })

      const { result } = renderHook(() => useBuildPack(), {
        wrapper: createWrapper(),
      })

      await act(async () => {
        result.current.mutate({ projectPath: 'C:\\Hytale\\packs\\MyPack' })
      })

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith('Package complete! Created MyPack-3.0.0.zip')
      })
    })

    it('shows error toast on packaging failure', async () => {
      const fixtures = createFixtures()
      const buildPack = vi.fn().mockResolvedValue({
        success: false,
        output: 'Error packaging',
        durationMs: 500,
      })
      buildHymnApi(fixtures, { buildPack })

      const { result } = renderHook(() => useBuildPack(), {
        wrapper: createWrapper(),
      })

      await act(async () => {
        result.current.mutate({ projectPath: 'C:\\Hytale\\packs\\TestPack' })
      })

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Packaging failed.')
      })
    })
  })

  describe('useCopyArtifactToMods', () => {
    it('calls copyArtifactToMods API with artifact ID', async () => {
      const fixtures = createFixtures()
      const copyArtifactToMods = vi.fn().mockResolvedValue({
        success: true,
        destinationPath: 'C:\\Hytale\\UserData\\Mods\\TestPlugin-1.0.0.jar',
      })
      buildHymnApi(fixtures, { copyArtifactToMods })

      const { result } = renderHook(() => useCopyArtifactToMods(), {
        wrapper: createWrapper(),
      })

      await act(async () => {
        result.current.mutate({ artifactId: 'artifact-123' })
      })

      await waitFor(() => {
        expect(copyArtifactToMods).toHaveBeenCalledWith('artifact-123')
      })
    })

    it('shows success toast with destination path', async () => {
      const fixtures = createFixtures()
      const copyArtifactToMods = vi.fn().mockResolvedValue({
        success: true,
        destinationPath: 'C:\\Hytale\\UserData\\Mods\\TestPlugin-1.0.0.jar',
      })
      buildHymnApi(fixtures, { copyArtifactToMods })

      const { result } = renderHook(() => useCopyArtifactToMods(), {
        wrapper: createWrapper(),
      })

      await act(async () => {
        result.current.mutate({ artifactId: 'artifact-123' })
      })

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith(
          'Installed to C:\\Hytale\\UserData\\Mods\\TestPlugin-1.0.0.jar'
        )
      })
    })

    it('shows reinstalled message when replacing existing mod', async () => {
      const fixtures = createFixtures()
      const copyArtifactToMods = vi.fn().mockResolvedValue({
        success: true,
        destinationPath: 'C:\\Hytale\\UserData\\Mods\\TestPlugin-1.0.0.jar',
        replacedPath: 'C:\\Hytale\\UserData\\Mods\\TestPlugin-0.9.0.jar',
      })
      buildHymnApi(fixtures, { copyArtifactToMods })

      const { result } = renderHook(() => useCopyArtifactToMods(), {
        wrapper: createWrapper(),
      })

      await act(async () => {
        result.current.mutate({ artifactId: 'artifact-123' })
      })

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith('Mod reinstalled successfully')
      })
    })

    it('shows error toast on failure', async () => {
      const fixtures = createFixtures()
      const copyArtifactToMods = vi.fn().mockRejectedValue(new Error('Disk full'))
      buildHymnApi(fixtures, { copyArtifactToMods })

      const { result } = renderHook(() => useCopyArtifactToMods(), {
        wrapper: createWrapper(),
      })

      await act(async () => {
        result.current.mutate({ artifactId: 'artifact-123' })
      })

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Disk full')
      })
    })
  })

  describe('useDeleteBuildArtifact', () => {
    it('calls deleteBuildArtifact API', async () => {
      const fixtures = createFixtures()
      const deleteBuildArtifact = vi.fn().mockResolvedValue({ success: true })
      buildHymnApi(fixtures, { deleteBuildArtifact })

      const { result } = renderHook(() => useDeleteBuildArtifact(), {
        wrapper: createWrapper(),
      })

      await act(async () => {
        result.current.mutate({ artifactId: 'artifact-123' })
      })

      await waitFor(() => {
        expect(deleteBuildArtifact).toHaveBeenCalledWith({ artifactId: 'artifact-123' })
      })
    })

    it('shows success toast on deletion', async () => {
      const fixtures = createFixtures()
      const deleteBuildArtifact = vi.fn().mockResolvedValue({ success: true })
      buildHymnApi(fixtures, { deleteBuildArtifact })

      const { result } = renderHook(() => useDeleteBuildArtifact(), {
        wrapper: createWrapper(),
      })

      await act(async () => {
        result.current.mutate({ artifactId: 'artifact-123' })
      })

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith('Artifact deleted')
      })
    })
  })

  describe('useClearAllBuildArtifacts', () => {
    it('calls clearAllBuildArtifacts API', async () => {
      const fixtures = createFixtures()
      const clearAllBuildArtifacts = vi.fn().mockResolvedValue({
        success: true,
        deletedCount: 5,
      })
      buildHymnApi(fixtures, { clearAllBuildArtifacts })

      const { result } = renderHook(() => useClearAllBuildArtifacts(), {
        wrapper: createWrapper(),
      })

      await act(async () => {
        result.current.mutate()
      })

      await waitFor(() => {
        expect(clearAllBuildArtifacts).toHaveBeenCalled()
      })
    })

    it('shows success toast with count (plural)', async () => {
      const fixtures = createFixtures()
      const clearAllBuildArtifacts = vi.fn().mockResolvedValue({
        success: true,
        deletedCount: 5,
      })
      buildHymnApi(fixtures, { clearAllBuildArtifacts })

      const { result } = renderHook(() => useClearAllBuildArtifacts(), {
        wrapper: createWrapper(),
      })

      await act(async () => {
        result.current.mutate()
      })

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith('Cleared 5 build artifacts')
      })
    })

    it('shows success toast with count (singular)', async () => {
      const fixtures = createFixtures()
      const clearAllBuildArtifacts = vi.fn().mockResolvedValue({
        success: true,
        deletedCount: 1,
      })
      buildHymnApi(fixtures, { clearAllBuildArtifacts })

      const { result } = renderHook(() => useClearAllBuildArtifacts(), {
        wrapper: createWrapper(),
      })

      await act(async () => {
        result.current.mutate()
      })

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith('Cleared 1 build artifact')
      })
    })
  })
})
