import { useMutation, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '../queries'
import type { ThemeMode, ModSortOrder, InstallInfo } from '@/shared/hymn-types'

export function useSetTheme() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (theme: ThemeMode) => {
      await window.hymnSettings.setTheme(theme)
      // Apply theme class to document
      const isDark =
        theme === 'dark' || (theme === 'system' && (await window.hymnTheme.get()))
      document.documentElement.classList.toggle('dark', isDark)
      return theme
    },
    onSuccess: (theme) => {
      queryClient.setQueryData<ThemeMode>(queryKeys.settings.theme, theme)
    },
  })
}

export function useSetModSortOrder() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (order: ModSortOrder) => {
      await window.hymnSettings.setModSortOrder(order)
      return order
    },
    onSuccess: (order) => {
      queryClient.setQueryData<ModSortOrder>(queryKeys.settings.modSortOrder, order)
    },
  })
}

export function useSetDefaultExportPath() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (path: string | null) => {
      await window.hymnSettings.setDefaultExportPath(path)
      return path
    },
    onSuccess: (path) => {
      queryClient.setQueryData<string | null>(queryKeys.settings.defaultExportPath, path)
    },
  })
}

export function useSelectDefaultExportPath() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async () => {
      return await window.hymnSettings.selectDefaultExportPath()
    },
    onSuccess: (path) => {
      if (path) {
        queryClient.setQueryData<string | null>(queryKeys.settings.defaultExportPath, path)
      }
    },
  })
}

export function useSelectInstallPath() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async () => {
      return await window.hymn.selectInstallPath()
    },
    onSuccess: (info) => {
      queryClient.setQueryData<InstallInfo>(queryKeys.installInfo, info)
      if (info.activePath) {
        // Invalidate dependent queries
        queryClient.invalidateQueries({ queryKey: queryKeys.worlds.all })
        queryClient.invalidateQueries({ queryKey: queryKeys.mods.all })
      }
    },
  })
}
