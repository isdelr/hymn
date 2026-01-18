import { useQuery } from '@tanstack/react-query'
import { queryKeys } from './queryKeys'
import type { WorldsState } from '@/shared/hymn-types'

export function useWorlds(enabled: boolean = true) {
  return useQuery<WorldsState>({
    queryKey: queryKeys.worlds.all,
    queryFn: () => window.hymn.getWorlds(),
    enabled,
  })
}
