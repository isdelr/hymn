import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { queryKeys } from '../queries'

/**
 * Hook to manually check for updates
 */
export function useCheckForUpdates() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async () => {
      return window.hymnUpdate.checkForUpdates()
    },
    onMutate: () => {
      toast.info('Checking for updates...')
    },
    onSuccess: (info) => {
      queryClient.setQueryData(queryKeys.update.info, info)
      if (info.status === 'available') {
        toast.success(`Update ${info.version} is available!`)
      } else if (info.status === 'not-available') {
        toast.success('You are running the latest version.')
      } else if (info.status === 'error') {
        toast.error(info.error || 'Failed to check for updates')
      }
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to check for updates')
    },
  })
}

/**
 * Hook to download an available update
 */
export function useDownloadUpdate() {
  return useMutation({
    mutationFn: async () => {
      await window.hymnUpdate.downloadUpdate()
    },
    onMutate: () => {
      toast.info('Starting download...')
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to download update')
    },
  })
}

/**
 * Hook to quit and install the downloaded update
 */
export function useInstallUpdate() {
  return useMutation({
    mutationFn: async () => {
      window.hymnUpdate.installUpdate()
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to install update')
    },
  })
}
