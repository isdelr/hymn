import { useQuery } from '@tanstack/react-query'
import { queryKeys } from './queryKeys'
import type { ProfilesState } from '@/shared/hymn-types'

export function useProfiles() {
  return useQuery<ProfilesState>({
    queryKey: queryKeys.profiles.all,
    queryFn: () => window.hymn.getProfiles(),
  })
}
