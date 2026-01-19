import { useEffect } from 'react'
import { useInstallInfo } from '@/hooks/queries'

/**
 * Hook to manage file watchers for the Mods page.
 * Starts mods and world config watchers when the page is mounted,
 * and stops them when the page is unmounted.
 */
export function useModsWatchers() {
  const { data: installInfo } = useInstallInfo()

  // Start/stop mods watcher based on install info
  useEffect(() => {
    if (installInfo?.modsPath || installInfo?.earlyPluginsPath) {
      window.hymnFileWatcher.startModsWatcher(
        installInfo.modsPath,
        installInfo.earlyPluginsPath
      )
    }

    return () => {
      window.hymnFileWatcher.stopModsWatcher()
    }
  }, [installInfo?.modsPath, installInfo?.earlyPluginsPath])

  // Start/stop world config watcher based on install info
  useEffect(() => {
    if (installInfo?.userDataPath) {
      const savesPath = `${installInfo.userDataPath}/Saves`
      window.hymnFileWatcher.startWorldConfigWatcher(savesPath)
    }

    return () => {
      window.hymnFileWatcher.stopWorldConfigWatcher()
    }
  }, [installInfo?.userDataPath])
}

/**
 * Hook to manage file watchers for the Create page.
 * Starts projects and builds watchers when the page is mounted,
 * and stops them when the page is unmounted.
 */
export function useCreateWatchers() {
  useEffect(() => {
    window.hymnFileWatcher.startProjectsWatcher()
    window.hymnFileWatcher.startBuildsWatcher()

    return () => {
      window.hymnFileWatcher.stopProjectsWatcher()
      window.hymnFileWatcher.stopBuildsWatcher()
    }
  }, [])
}
