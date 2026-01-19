import { useEffect, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { queryKeys } from './queries/queryKeys'
import type { FileChangeEvent } from '@/shared/hymn-types'

interface UseFileWatcherOptions {
  projectPath: string | null
  onJavaFileChange?: (event: FileChangeEvent) => void
  onManifestChange?: (event: FileChangeEvent) => void
  onAssetChange?: (event: FileChangeEvent) => void
  /** Called for ANY file change in the project (regardless of type) */
  onAnyFileChange?: (event: FileChangeEvent) => void
}

/**
 * Hook to watch a project directory for file changes.
 * Automatically invalidates React Query caches when files change.
 *
 * Uses two separate effects:
 * 1. Watcher lifecycle (start/stop based on projectPath)
 * 2. Event subscription (always active, filters by projectPath)
 */
export function useFileWatcher({
  projectPath,
  onJavaFileChange,
  onManifestChange,
  onAssetChange,
  onAnyFileChange,
}: UseFileWatcherOptions) {
  const queryClient = useQueryClient()

  // Store callbacks in refs to avoid retriggering subscription effect
  const onJavaFileChangeRef = useRef(onJavaFileChange)
  const onManifestChangeRef = useRef(onManifestChange)
  const onAssetChangeRef = useRef(onAssetChange)
  const onAnyFileChangeRef = useRef(onAnyFileChange)
  const projectPathRef = useRef(projectPath)

  // Keep refs in sync with props after render
  useEffect(() => {
    onJavaFileChangeRef.current = onJavaFileChange
    onManifestChangeRef.current = onManifestChange
    onAssetChangeRef.current = onAssetChange
    onAnyFileChangeRef.current = onAnyFileChange
    projectPathRef.current = projectPath
  })

  // Effect 1: Manage watcher lifecycle
  useEffect(() => {
    if (!projectPath) return

    window.hymnFileWatcher.watchProject(projectPath)

    return () => {
      window.hymnFileWatcher.unwatchProject()
    }
  }, [projectPath])

  // Effect 2: Subscribe to file change events (separate from watcher lifecycle)
  useEffect(() => {
    const handleFileChange = (event: FileChangeEvent) => {
      // Only process events for the project we're watching
      if (event.projectPath !== projectPathRef.current) {
        return
      }

      // Always call onAnyFileChange first
      onAnyFileChangeRef.current?.(event)

      switch (event.changeType) {
        case 'java':
          // Invalidate Java sources query
          queryClient.invalidateQueries({
            queryKey: queryKeys.javaSources.all(projectPathRef.current),
          })
          // Also invalidate the specific file content if it was being viewed
          queryClient.invalidateQueries({
            queryKey: queryKeys.javaSources.file(event.filePath),
          })
          // Invalidate project files for file explorer
          queryClient.invalidateQueries({
            queryKey: queryKeys.projectFiles.all(projectPathRef.current),
          })
          onJavaFileChangeRef.current?.(event)
          break

        case 'manifest':
          // Invalidate projects list to refresh manifest data
          queryClient.invalidateQueries({
            queryKey: queryKeys.projects.all,
          })
          onManifestChangeRef.current?.(event)
          break

        case 'asset':
          // Invalidate assets query
          queryClient.invalidateQueries({
            queryKey: queryKeys.assets.all(projectPathRef.current),
          })
          // Invalidate project files for file explorer
          queryClient.invalidateQueries({
            queryKey: queryKeys.projectFiles.all(projectPathRef.current),
          })
          onAssetChangeRef.current?.(event)
          break

        default:
          // For other files, invalidate project files for file explorer
          queryClient.invalidateQueries({
            queryKey: queryKeys.projectFiles.all(projectPathRef.current),
          })
          break
      }
    }

    // Subscribe to file change events
    const unsubscribe = window.hymnFileWatcher.onFileChange(handleFileChange)

    return () => {
      unsubscribe()
    }
  }, [queryClient])
}
