import { useQuery } from '@tanstack/react-query'
import { queryKeys } from './queryKeys'
import type { BuildArtifact, CheckDependenciesResult } from '@/shared/hymn-types'

export function useBuildArtifacts() {
  return useQuery<BuildArtifact[]>({
    queryKey: queryKeys.builds.artifacts,
    queryFn: async () => {
      const result = await window.hymn.listBuildArtifacts()
      return result.artifacts
    },
  })
}

export function useDependencies() {
  return useQuery<CheckDependenciesResult>({
    queryKey: queryKeys.builds.dependencies,
    queryFn: async () => {
      return await window.hymn.checkDependencies()
    },
    staleTime: 5 * 60 * 1000, // 5 minutes - dependencies don't change often
  })
}

export function useJdkPath() {
  return useQuery<string | null>({
    queryKey: queryKeys.settings.jdkPath,
    queryFn: async () => {
      return await window.hymnSettings.getJdkPath()
    },
  })
}
