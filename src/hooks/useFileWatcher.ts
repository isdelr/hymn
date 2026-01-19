import { useEffect, useCallback, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { queryKeys } from './queries/queryKeys'
import type { FileChangeEvent } from '@/shared/hymn-types'

interface UseFileWatcherOptions {
  projectPath: string | null
  onJavaFileChange?: (event: FileChangeEvent) => void
  onManifestChange?: (event: FileChangeEvent) => void
  onAssetChange?: (event: FileChangeEvent) => void
}

/**
 * Hook to watch a project directory for file changes.
 * Automatically invalidates React Query caches when files change.
 */
export function useFileWatcher({
  projectPath,
  onJavaFileChange,
  onManifestChange,
  onAssetChange,
}: UseFileWatcherOptions) {
  const queryClient = useQueryClient()
  const cleanupRef = useRef<(() => void) | null>(null)

  const handleFileChange = useCallback(
    (event: FileChangeEvent) => {
      // Only process events for the project we're watching
      if (event.projectPath !== projectPath) return

      switch (event.changeType) {
        case 'java':
          // Invalidate Java sources query
          queryClient.invalidateQueries({
            queryKey: queryKeys.javaSources.all(projectPath),
          })
          // Also invalidate the specific file content if it was being viewed
          queryClient.invalidateQueries({
            queryKey: queryKeys.javaSources.file(event.filePath),
          })
          // Invalidate project files for file explorer
          queryClient.invalidateQueries({
            queryKey: queryKeys.projectFiles.all(projectPath),
          })
          onJavaFileChange?.(event)
          break

        case 'manifest':
          // Invalidate projects list to refresh manifest data
          queryClient.invalidateQueries({
            queryKey: queryKeys.projects.all,
          })
          onManifestChange?.(event)
          break

        case 'asset':
          // Invalidate assets query
          queryClient.invalidateQueries({
            queryKey: queryKeys.assets.all(projectPath),
          })
          // Invalidate project files for file explorer
          queryClient.invalidateQueries({
            queryKey: queryKeys.projectFiles.all(projectPath),
          })
          onAssetChange?.(event)
          break

        default:
          // For other files, invalidate project files for file explorer
          queryClient.invalidateQueries({
            queryKey: queryKeys.projectFiles.all(projectPath),
          })
          break
      }
    },
    [projectPath, queryClient, onJavaFileChange, onManifestChange, onAssetChange]
  )

  useEffect(() => {
    if (!projectPath) {
      // No project to watch, clean up any existing watcher
      if (cleanupRef.current) {
        cleanupRef.current()
        cleanupRef.current = null
      }
      window.hymnFileWatcher.unwatchProject()
      return
    }

    // Start watching the project
    window.hymnFileWatcher.watchProject(projectPath)

    // Subscribe to file change events
    const unsubscribe = window.hymnFileWatcher.onFileChange(handleFileChange)
    cleanupRef.current = unsubscribe

    return () => {
      // Clean up on unmount or when projectPath changes
      unsubscribe()
      cleanupRef.current = null
      window.hymnFileWatcher.unwatchProject()
    }
  }, [projectPath, handleFileChange])
}
