import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { queryKeys } from './queries/queryKeys'
import type { DirectoryChangeEvent } from '@/shared/hymn-types'

export function useDirectoryWatchers() {
  const queryClient = useQueryClient()

  useEffect(() => {
    // Subscribe to projects directory changes
    const unsubProjects = window.hymnFileWatcher.onProjectsChange((event: DirectoryChangeEvent) => {
      console.log('Projects directory changed:', event)
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.all })
    })

    // Subscribe to builds directory changes
    const unsubBuilds = window.hymnFileWatcher.onBuildsChange((event: DirectoryChangeEvent) => {
      console.log('Builds directory changed:', event)
      queryClient.invalidateQueries({ queryKey: queryKeys.builds.artifacts })
      queryClient.invalidateQueries({ queryKey: queryKeys.builds.installedMods })
    })

    // Subscribe to mods directory changes
    const unsubMods = window.hymnFileWatcher.onModsChange((event: DirectoryChangeEvent) => {
      console.log('Mods directory changed:', event)
      queryClient.invalidateQueries({ queryKey: queryKeys.mods.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.mods.scan(null) })
    })

    return () => {
      unsubProjects()
      unsubBuilds()
      unsubMods()
    }
  }, [queryClient])
}
