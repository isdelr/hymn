import { useQuery } from '@tanstack/react-query'
import { queryKeys } from './queryKeys'
import type { ListJavaSourcesResult } from '@/shared/hymn-types'

export function useJavaSources(projectPath: string | null) {
  return useQuery<ListJavaSourcesResult>({
    queryKey: queryKeys.javaSources.all(projectPath ?? ''),
    queryFn: async () => {
      if (!projectPath) {
        return { sources: [], basePackage: '', sourceRoot: '' }
      }
      return window.hymn.listJavaSources({ projectPath })
    },
    enabled: !!projectPath,
  })
}

export function useJavaFileContent(filePath: string | null) {
  return useQuery<string>({
    queryKey: queryKeys.javaSources.file(filePath ?? ''),
    queryFn: async () => {
      if (!filePath) return ''
      return window.hymn.readFile(filePath)
    },
    enabled: !!filePath,
  })
}
