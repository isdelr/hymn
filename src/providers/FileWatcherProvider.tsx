import { useEffect, type ReactNode } from 'react'
import { useDirectoryWatchers } from '@/hooks/useDirectoryWatchers'
import { useInstallInfo } from '@/hooks/queries'

interface FileWatcherProviderProps {
  children: ReactNode
}

export function FileWatcherProvider({ children }: FileWatcherProviderProps) {
  // Set up directory watchers for automatic query invalidation
  useDirectoryWatchers()

  // Get install info to start mods watcher when paths are available
  const { data: installInfo } = useInstallInfo()

  useEffect(() => {
    // Start mods watcher when install info is available
    if (installInfo?.modsPath || installInfo?.packsPath || installInfo?.earlyPluginsPath) {
      window.hymnFileWatcher.startModsWatcher(
        installInfo.modsPath,
        installInfo.packsPath,
        installInfo.earlyPluginsPath
      )
    }

    return () => {
      // Stop mods watcher on unmount or when paths change
      window.hymnFileWatcher.stopModsWatcher()
    }
  }, [installInfo?.modsPath, installInfo?.packsPath, installInfo?.earlyPluginsPath])

  return <>{children}</>
}
