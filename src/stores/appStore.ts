import { create } from 'zustand'
import { devtools } from 'zustand/middleware'

/**
 * AppStore - UI State Only
 *
 * This store now only manages UI selections.
 * Server state (installInfo, scanResult, worlds, profiles) is managed by React Query.
 * Loading states are derived from React Query's isLoading/isPending.
 * Errors are shown via toast notifications.
 */
interface AppState {
  // UI Selections - persisted across renders
  selectedWorldId: string | null
}

interface AppActions {
  setSelectedWorldId: (worldId: string | null) => void
}

type AppStore = AppState & AppActions

export const useAppStore = create<AppStore>()(
  devtools(
    (set) => ({
      // Initial state
      selectedWorldId: null,

      // Actions
      setSelectedWorldId: (worldId) => set({ selectedWorldId: worldId }),
    }),
    { name: 'app-store' }
  )
)
