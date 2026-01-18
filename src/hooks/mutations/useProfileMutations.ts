import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { queryKeys } from '../queries'
import type { Profile, ProfilesState } from '@/shared/hymn-types'

export function useCreateProfile() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (name: string) => {
      const state = await window.hymn.createProfile(name)
      if (state.activeProfileId) {
        await window.hymn.applyProfile(state.activeProfileId)
      }
      return state
    },
    onSuccess: (state) => {
      queryClient.setQueryData<ProfilesState>(queryKeys.profiles.all, state)
      // Invalidate mods to refresh after profile change
      queryClient.invalidateQueries({ queryKey: queryKeys.mods.all })
      toast.success('Profile created')
    },
    onError: () => {
      toast.error('Unable to create profile.')
    },
  })
}

export function useActivateProfile() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (profileId: string) => {
      const state = await window.hymn.setActiveProfile(profileId)
      await window.hymn.applyProfile(profileId)
      return state
    },
    onSuccess: (state) => {
      queryClient.setQueryData<ProfilesState>(queryKeys.profiles.all, state)
      // Invalidate mods to refresh after profile change
      queryClient.invalidateQueries({ queryKey: queryKeys.mods.all })
      toast.success('Profile activated')
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Unable to switch profiles.')
    },
  })
}

export function useUpdateProfile() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (profile: Profile) => {
      return await window.hymn.updateProfile(profile)
    },
    onSuccess: (updatedProfile) => {
      // Update the profile in the cache
      queryClient.setQueryData<ProfilesState>(queryKeys.profiles.all, (old) => {
        if (!old) return old
        return {
          ...old,
          profiles: old.profiles.map((p) =>
            p.id === updatedProfile.id ? updatedProfile : p
          ),
        }
      })
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Unable to update profile.')
    },
  })
}
