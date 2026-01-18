import { useQuery } from '@tanstack/react-query'
import { queryKeys } from './queryKeys'
import type { ProjectEntry } from '@/shared/hymn-types'

export function useProjects() {
  return useQuery<ProjectEntry[]>({
    queryKey: queryKeys.projects.all,
    queryFn: async () => {
      const result = await window.hymn.listProjects()
      return result.projects.sort((a, b) => a.name.localeCompare(b.name))
    },
  })
}
