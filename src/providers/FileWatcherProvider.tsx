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
    if (installInfo?.modsPath || installInfo?.earlyPluginsPath) {
      window.hymnFileWatcher.startModsWatcher(
        installInfo.modsPath,
        installInfo.earlyPluginsPath
      )
    }

    return () => {
      // Stop mods watcher on unmount or when paths change
      window.hymnFileWatcher.stopModsWatcher()
    }
  }, [installInfo?.modsPath, installInfo?.earlyPluginsPath])

  // Start world config watcher to detect external mod toggles
  useEffect(() => {
    if (installInfo?.userDataPath) {
      // Construct savesPath from userDataPath
      const savesPath = `${installInfo.userDataPath}/Saves`
      window.hymnFileWatcher.startWorldConfigWatcher(savesPath)
    }

    return () => {
      window.hymnFileWatcher.stopWorldConfigWatcher()
    }
  }, [installInfo?.userDataPath])

  return <>{children}</>
}
