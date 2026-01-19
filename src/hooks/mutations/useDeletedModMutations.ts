import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { queryKeys } from '../queries'
import type { RestoreDeletedModResult, ModLocation } from '@/shared/hymn-types'

interface RestoreDeletedModParams {
  backupId: string
  targetLocation: ModLocation
}

export function useRestoreDeletedMod() {
  const queryClient = useQueryClient()

  return useMutation<RestoreDeletedModResult, Error, RestoreDeletedModParams>({
    mutationFn: async (params) => {
      return await window.hymn.restoreDeletedMod(params)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.deletedMods.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.mods.all })
      toast.success('Mod restored successfully')
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to restore mod')
    },
  })
}

export function usePermanentlyDeleteMod() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (backupId: string) => {
      return await window.hymn.permanentlyDeleteMod({ backupId })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.deletedMods.all })
      toast.success('Backup permanently deleted')
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to delete backup')
    },
  })
}

export function useClearDeletedMods() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async () => {
      return await window.hymn.clearDeletedMods()
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.deletedMods.all })
      toast.success(`Cleared ${result.deletedCount} backup${result.deletedCount === 1 ? '' : 's'}`)
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to clear backups')
    },
  })
}
