import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { queryKeys } from './queryKeys'
import type { UpdateInfo } from '@/shared/hymn-types'

/**
 * Hook to get and subscribe to update status
 * Fetches initial status and subscribes to real-time updates
 */
export function useUpdateInfo() {
  const queryClient = useQueryClient()

  // Subscribe to real-time update status changes
  useEffect(() => {
    const unsubscribe = window.hymnUpdate.onUpdateStatus((info: UpdateInfo) => {
      queryClient.setQueryData(queryKeys.update.info, info)
    })
    return unsubscribe
  }, [queryClient])

  return useQuery({
    queryKey: queryKeys.update.info,
    queryFn: () => window.hymnUpdate.getInfo(),
    staleTime: Infinity, // Status is updated via subscription
    refetchOnWindowFocus: false,
  })
}
