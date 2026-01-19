import { useQuery } from '@tanstack/react-query'
import { queryKeys } from './queryKeys'
import type { ThemeMode, ModSortOrder, GradleVersion } from '@/shared/hymn-types'

export function useTheme() {
  return useQuery<ThemeMode>({
    queryKey: queryKeys.settings.theme,
    queryFn: () => window.hymnSettings.getTheme(),
  })
}

export function useModSortOrder() {
  return useQuery<ModSortOrder>({
    queryKey: queryKeys.settings.modSortOrder,
    queryFn: () => window.hymnSettings.getModSortOrder(),
  })
}

export function useDefaultExportPath() {
  return useQuery<string | null>({
    queryKey: queryKeys.settings.defaultExportPath,
    queryFn: () => window.hymnSettings.getDefaultExportPath(),
  })
}

export function useManagedJdkPath() {
  return useQuery<string | null>({
    queryKey: queryKeys.settings.managedJdkPath,
    queryFn: () => window.hymnSettings.getManagedJdkPath(),
  })
}

export function useGradleVersion() {
  return useQuery<GradleVersion>({
    queryKey: queryKeys.settings.gradleVersion,
    queryFn: () => window.hymnSettings.getGradleVersion(),
  })
}
