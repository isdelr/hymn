import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { queryKeys } from '../queries'
import type { WorldsState } from '@/shared/hymn-types'

export function useSelectWorld() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (worldId: string) => {
      await window.hymn.setSelectedWorld(worldId)
      return worldId
    },
    onSuccess: (worldId) => {
      // Update the worlds state cache with the new selected world
      queryClient.setQueryData<WorldsState>(queryKeys.worlds.all, (old) => {
        if (!old) return old
        return {
          ...old,
          selectedWorldId: worldId,
        }
      })
      // Invalidate mods to refetch for the new world
      queryClient.invalidateQueries({ queryKey: queryKeys.mods.scan(worldId) })
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Unable to switch worlds.')
    },
  })
}

export function useExportWorldMods() {
  return useMutation({
    mutationFn: async (worldId: string) => {
      return await window.hymn.exportWorldMods({ worldId })
    },
    onSuccess: (result) => {
      toast.success(`Exported ${result.modCount} mods`)
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : 'Failed to export mods.'
      if (!message.includes('cancelled')) {
        toast.error(message)
      }
    },
  })
}

export function useImportWorldMods() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async () => {
      return await window.hymn.importWorldMods()
    },
    onSuccess: (result) => {
      toast.success(`Imported ${result.modsImported} mods, skipped ${result.modsSkipped}`)
      // Invalidate mods to refresh the list
      queryClient.invalidateQueries({ queryKey: queryKeys.mods.all })
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : 'Failed to import mods.'
      if (!message.includes('cancelled')) {
        toast.error(message)
      }
    },
  })
}
