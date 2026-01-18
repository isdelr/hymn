import { useQuery } from '@tanstack/react-query'
import { queryKeys } from './queryKeys'
import type { ServerAsset } from '@/shared/hymn-types'

export function useAssets(projectPath: string | null) {
  return useQuery<ServerAsset[]>({
    queryKey: queryKeys.assets.all(projectPath ?? ''),
    queryFn: async () => {
      if (!projectPath) return []
      const result = await window.hymn.listServerAssets({ path: projectPath })
      return result.assets
    },
    enabled: !!projectPath,
  })
}
