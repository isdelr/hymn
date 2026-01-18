import { useQuery } from '@tanstack/react-query'
import { queryKeys } from './queryKeys'
import type { InstallInfo } from '@/shared/hymn-types'

export function useInstallInfo() {
  return useQuery<InstallInfo>({
    queryKey: queryKeys.installInfo,
    queryFn: () => window.hymn.getInstallInfo(),
  })
}
