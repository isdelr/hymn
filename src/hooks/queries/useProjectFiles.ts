import { useQuery } from '@tanstack/react-query'
import { queryKeys } from './queryKeys'
import type { ListProjectFilesResult } from '@/shared/hymn-types'

export function useProjectFiles(projectPath: string | null) {
  return useQuery<ListProjectFilesResult>({
    queryKey: queryKeys.projectFiles.all(projectPath ?? ''),
    queryFn: async () => {
      if (!projectPath) {
        return { root: { name: '', path: '', type: 'directory' as const, parentPath: null, children: [] } }
      }
      return window.hymn.listProjectFiles({ path: projectPath, recursive: true })
    },
    enabled: !!projectPath,
  })
}
