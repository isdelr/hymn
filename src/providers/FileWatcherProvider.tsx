import type { ReactNode } from 'react'
import { useDirectoryWatchers } from '@/hooks/useDirectoryWatchers'

interface FileWatcherProviderProps {
  children: ReactNode
}

export function FileWatcherProvider({ children }: FileWatcherProviderProps) {
  // Set up directory watchers for automatic query invalidation
  // Note: This only sets up event listeners. Actual file watchers are
  // started/stopped by route-specific hooks (useModsWatchers, useCreateWatchers)
  useDirectoryWatchers()

  return <>{children}</>
}
