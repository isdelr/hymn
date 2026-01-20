import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'

interface UpdateStoreState {
  // Track versions that have been dismissed by the user
  dismissedVersions: string[]
}

interface UpdateStoreActions {
  dismissVersion: (version: string) => void
  isDismissed: (version: string | null) => boolean
  clearDismissed: () => void
}

type UpdateStore = UpdateStoreState & UpdateStoreActions

export const useUpdateStore = create<UpdateStore>()(
  devtools(
    persist(
      (set, get) => ({
        // Initial state
        dismissedVersions: [],

        // Actions
        dismissVersion: (version) =>
          set((state) => ({
            dismissedVersions: state.dismissedVersions.includes(version)
              ? state.dismissedVersions
              : [...state.dismissedVersions, version],
          })),

        isDismissed: (version) => {
          if (!version) return false
          return get().dismissedVersions.includes(version)
        },

        clearDismissed: () => set({ dismissedVersions: [] }),
      }),
      {
        name: 'hymn-update-store',
      }
    ),
    { name: 'update-store' }
  )
)
