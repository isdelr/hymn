import { useQuery } from '@tanstack/react-query'
import { queryKeys } from './queryKeys'
import type { ProjectEntry } from '@/shared/hymn-types'

/**
 * Fetch a single project by its path.
 */
async function fetchProject(projectPath: string): Promise<ProjectEntry | null> {
  const result = await window.hymn.listProjects()
  return result.projects.find(p => p.path === projectPath) ?? null
}

interface UseProjectOptions {
  /**
   * Whether to enable the query
   */
  enabled?: boolean
}

/**
 * Hook for fetching a single project by path.
 * Replaces manual state management with React Query.
 */
export function useProject(projectPath: string | undefined, options: UseProjectOptions = {}) {
  const { enabled = true } = options

  return useQuery({
    queryKey: queryKeys.projects.detail(projectPath ?? ''),
    queryFn: () => fetchProject(projectPath!),
    enabled: enabled && !!projectPath,
    staleTime: 30_000, // 30 seconds
  })
}
