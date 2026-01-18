import { useQuery } from '@tanstack/react-query'
import { queryKeys } from './queryKeys'
import type { ScanResult } from '@/shared/hymn-types'

export function useMods(worldId: string | null) {
  return useQuery<ScanResult>({
    queryKey: queryKeys.mods.scan(worldId),
    queryFn: () => window.hymn.scanMods(worldId ?? undefined),
    enabled: true, // Always fetch mods, worldId can be null/undefined
  })
}
