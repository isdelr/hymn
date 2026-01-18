import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { queryKeys } from '../queries'
import type { ModEntry } from '@/shared/hymn-types'

export function useToggleMod() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      worldId,
      entry,
      enabled,
    }: {
      worldId: string
      entry: ModEntry
      enabled: boolean
    }) => {
      await window.hymn.setModEnabled({
        worldId,
        modId: entry.id,
        enabled,
      })
      return { worldId, entry, enabled }
    },
    onSuccess: ({ worldId }) => {
      // Invalidate mods query to refresh the list
      queryClient.invalidateQueries({ queryKey: queryKeys.mods.scan(worldId) })
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Unable to toggle mod.')
    },
  })
}

export function useDeleteMod() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      entry,
      worldId,
    }: {
      entry: ModEntry
      worldId: string | null
    }) => {
      const result = await window.hymn.deleteMod({
        modId: entry.id,
        modPath: entry.path,
      })
      return { success: result.success, worldId }
    },
    onSuccess: ({ success, worldId }) => {
      if (success) {
        toast.success('Mod deleted')
        queryClient.invalidateQueries({ queryKey: queryKeys.mods.scan(worldId) })
      }
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Unable to delete mod.')
    },
  })
}

export function useAddMods() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (worldId: string | null) => {
      const result = await window.hymn.addMods()
      return { success: result.success, worldId }
    },
    onSuccess: ({ success, worldId }) => {
      if (success) {
        toast.success('Mods added')
        queryClient.invalidateQueries({ queryKey: queryKeys.mods.scan(worldId) })
      }
    },
    onError: (error) => {
      // Don't show error if user cancelled
      if (error instanceof Error && error.message.includes('cancelled')) {
        return
      }
      toast.error(error instanceof Error ? error.message : 'Unable to add mods.')
    },
  })
}
