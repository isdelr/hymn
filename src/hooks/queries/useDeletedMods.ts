import { useQuery } from '@tanstack/react-query'
import { queryKeys } from './queryKeys'
import type { DeletedModEntry } from '@/shared/hymn-types'

export function useDeletedMods() {
  return useQuery<DeletedModEntry[]>({
    queryKey: queryKeys.deletedMods.all,
    queryFn: async () => {
      const result = await window.hymn.listDeletedMods()
      return result.entries
    },
  })
}
