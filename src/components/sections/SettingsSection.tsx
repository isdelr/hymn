import { useState, useEffect } from 'react'
import {
  HardDrive,
  Palette,
  SortAsc,
  Server,
  Coffee,
  Cog,
  Download,
  X,
  FolderOpen,
  Info,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'
import type { ThemeMode, ModSortOrder, GradleVersion, JdkDownloadProgress } from '@/shared/hymn-types'

// React Query hooks
import { useInstallInfo, useTheme, useModSortOrder, useServerJarPath, useDependencies, useGradleVersion, useJdkPath, useAppVersion } from '@/hooks/queries'
import {
  useSelectInstallPath,
  useSetTheme,
  useSetModSortOrder,
  useSelectServerJarPath,
  useSetServerJarPath,
  useSetGradleVersion,
  useSelectJdkPath,
  useDownloadJdk,
  useCancelJdkDownload,
  useClearJdkPath,
} from '@/hooks/mutations'

// Helper to truncate paths for display
function truncatePath(path: string, maxLength = 50): string {
  if (path.length <= maxLength) return path
  const start = path.slice(0, 20)
  const end = path.slice(-25)
  return `${start}...${end}`
}

// Status dot component
function StatusDot({ active }: { active: boolean }) {
  return (
    <span
      className={cn(
        'inline-block h-2 w-2 rounded-full ml-2',
        active ? 'bg-emerald-500' : 'bg-red-500'
      )}
    />
  )
}

// Reusable row wrapper
function SettingRow({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-4 py-4 px-3 -mx-3 rounded-lg transition-colors hover:bg-muted/50">
      {children}
    </div>
  )
}

// Reusable icon container
function IconBox({
  children,
  colorClass,
}: {
  children: React.ReactNode
  colorClass: string
}) {
  return (
    <div
      className={cn(
        'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg',
        colorClass
      )}
    >
      {children}
    </div>
  )
}

export function SettingsSection() {
  // React Query data
  const { data: installInfo } = useInstallInfo()
  const { data: theme = 'system' } = useTheme()
  const { data: modSortOrder = 'name' } = useModSortOrder()
  const { data: serverJarPath = null } = useServerJarPath()
  const { data: dependencies } = useDependencies()
  const { data: gradleVersion = '9.3.0' } = useGradleVersion()
  const { data: customJdkPath = null } = useJdkPath()
  const { data: appVersion } = useAppVersion()

  // JDK download progress state
  const [jdkDownloadProgress, setJdkDownloadProgress] = useState<JdkDownloadProgress | null>(null)

  // Get the effective server jar path - either custom setting or resolved from dependencies
  const effectiveServerJarPath = serverJarPath || dependencies?.hytale?.serverJarPath || null
  const isUsingDefaultPath = !serverJarPath && !!dependencies?.hytale?.serverJarPath

  // Get JDK info from dependencies
  const jdkInfo = dependencies?.java
  const effectiveJdkPath = customJdkPath || jdkInfo?.jdkPath || null
  const jdkVersion = jdkInfo?.version || null
  const isJdkFound = jdkInfo?.status === 'found'
  const isUsingCustomJdk = !!customJdkPath

  // Mutations
  const selectInstallPath = useSelectInstallPath()
  const setTheme = useSetTheme()
  const setModSortOrder = useSetModSortOrder()
  const selectServerJarPath = useSelectServerJarPath()
  const setServerJarPath = useSetServerJarPath()
  const setGradleVersion = useSetGradleVersion()
  const selectJdkPath = useSelectJdkPath()
  const downloadJdk = useDownloadJdk()
  const cancelJdkDownload = useCancelJdkDownload()
  const clearJdkPath = useClearJdkPath()

  // Listen for JDK download progress
  useEffect(() => {
    const unsubscribe = window.hymnSettings.onJdkDownloadProgress((progress) => {
      setJdkDownloadProgress(progress)
      if (progress.status === 'complete' || progress.status === 'error') {
        // Clear progress after a delay
        setTimeout(() => setJdkDownloadProgress(null), 3000)
      }
    })
    return unsubscribe
  }, [])

  const handleThemeChange = (value: ThemeMode) => {
    setTheme.mutate(value)
  }

  const handleSortOrderChange = (value: ModSortOrder) => {
    setModSortOrder.mutate(value)
  }

  const handleSelectServerJarPath = () => {
    selectServerJarPath.mutate()
  }

  const handleClearServerJarPath = () => {
    setServerJarPath.mutate(null)
  }

  const handleGradleVersionChange = (value: GradleVersion) => {
    setGradleVersion.mutate(value)
  }

  const handleSelectJdkPath = () => {
    selectJdkPath.mutate()
  }

  const handleDownloadJdk = () => {
    downloadJdk.mutate()
  }

  const handleCancelJdkDownload = () => {
    cancelJdkDownload.mutate()
  }

  const handleClearJdkPath = () => {
    clearJdkPath.mutate()
  }

  const isDownloading = jdkDownloadProgress?.status === 'downloading' || jdkDownloadProgress?.status === 'extracting'
  const downloadPercent = jdkDownloadProgress?.totalBytes
    ? Math.round((jdkDownloadProgress.bytesDownloaded / jdkDownloadProgress.totalBytes) * 100)
    : 0

  return (
    <div className="space-y-1">
      {/* Row 1: Install Location */}
      <SettingRow>
        <IconBox colorClass="bg-primary/10">
          <HardDrive className="h-5 w-5 text-primary" />
        </IconBox>
        <div className="flex-1 min-w-0">
          <div className="flex items-center">
            <span className="text-sm font-medium">Hytale Install Location</span>
            <StatusDot active={!!installInfo?.activePath} />
          </div>
          <p className="text-xs text-muted-foreground truncate">
            {installInfo?.activePath
              ? truncatePath(installInfo.activePath)
              : (
                <>
                  Not configured - <a href="https://hytale.com/download" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Download Hytale</a>
                </>
              )}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => selectInstallPath.mutate()}
          disabled={selectInstallPath.isPending}
        >
          {installInfo?.activePath ? 'Change' : 'Select Folder'}
        </Button>
      </SettingRow>

      {/* Row 2: Server Jar */}
      <SettingRow>
        <IconBox colorClass="bg-blue-500/10">
          <Server className="h-5 w-5 text-blue-500" />
        </IconBox>
        <div className="flex-1 min-w-0">
          <div className="flex items-center">
            <span className="text-sm font-medium">Server Jar</span>
            <StatusDot active={!!effectiveServerJarPath} />
          </div>
          <p className="text-xs text-muted-foreground truncate">
            {effectiveServerJarPath ? truncatePath(effectiveServerJarPath) : 'Not configured'}
          </p>
          {isUsingDefaultPath && (
            <p className="text-xs text-muted-foreground/70 mt-0.5">
              Auto-detected from Hytale installation
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleSelectServerJarPath}
          >
            {serverJarPath ? 'Change' : isUsingDefaultPath ? 'Override' : 'Select File'}
          </Button>
          {serverJarPath && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearServerJarPath}
            >
              Clear
            </Button>
          )}
        </div>
      </SettingRow>

      {/* Row 3: JDK */}
      <SettingRow>
        <IconBox colorClass="bg-orange-500/10">
          <Coffee className="h-5 w-5 text-orange-500" />
        </IconBox>
        <div className="flex-1 min-w-0">
          <div className="flex items-center">
            <span className="text-sm font-medium">Java Development Kit</span>
            <StatusDot active={isJdkFound} />
          </div>
          {isDownloading ? (
            <div className="mt-1">
              <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                <span>{jdkDownloadProgress?.message}</span>
                {jdkDownloadProgress?.status === 'downloading' && jdkDownloadProgress.totalBytes > 0 && (
                  <span>({downloadPercent}%)</span>
                )}
              </div>
              <Progress value={downloadPercent} className="h-1.5" />
            </div>
          ) : jdkDownloadProgress?.status === 'complete' ? (
            <p className="text-xs text-emerald-500">{jdkDownloadProgress.message}</p>
          ) : jdkDownloadProgress?.status === 'error' ? (
            <p className="text-xs text-red-500">{jdkDownloadProgress.message}</p>
          ) : (
            <>
              <p className="text-xs text-muted-foreground truncate">
                {effectiveJdkPath ? truncatePath(effectiveJdkPath) : 'Not configured'}
              </p>
              {isJdkFound && jdkVersion && (
                <p className="text-xs text-muted-foreground/70 mt-0.5">
                  {isUsingCustomJdk ? 'Custom' : 'Auto-detected'} - Java {jdkVersion}
                </p>
              )}
            </>
          )}
        </div>
        <div className="flex items-center gap-2">
          {isDownloading ? (
            <Button
              variant="outline"
              size="sm"
              onClick={handleCancelJdkDownload}
            >
              <X className="h-4 w-4 mr-1" />
              Cancel
            </Button>
          ) : (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={handleSelectJdkPath}
                disabled={downloadJdk.isPending}
              >
                <FolderOpen className="h-4 w-4 mr-1" />
                Select
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownloadJdk}
                disabled={downloadJdk.isPending}
              >
                <Download className="h-4 w-4 mr-1" />
                Download
              </Button>
              {customJdkPath && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClearJdkPath}
                >
                  Clear
                </Button>
              )}
            </>
          )}
        </div>
      </SettingRow>

      {/* Row 4: Gradle Version */}
      <SettingRow>
        <IconBox colorClass="bg-teal-500/10">
          <Cog className="h-5 w-5 text-teal-500" />
        </IconBox>
        <div className="flex-1 min-w-0">
          <span className="text-sm font-medium">Gradle Version</span>
          <p className="text-xs text-muted-foreground">
            For new plugin projects
          </p>
        </div>
        <Select value={gradleVersion} onValueChange={(v) => handleGradleVersionChange(v as GradleVersion)}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="9.3.0">9.3.0 (Latest)</SelectItem>
            <SelectItem value="8.12.0">8.12.0</SelectItem>
            <SelectItem value="8.5">8.5</SelectItem>
          </SelectContent>
        </Select>
      </SettingRow>

      {/* Row 5: Theme */}
      <SettingRow>
        <IconBox colorClass="bg-violet-500/10">
          <Palette className="h-5 w-5 text-violet-500" />
        </IconBox>
        <div className="flex-1 min-w-0">
          <span className="text-sm font-medium">Theme</span>
          <p className="text-xs text-muted-foreground">
            {theme === 'system' ? 'System (default)' : theme === 'light' ? 'Light' : 'Dark'}
          </p>
        </div>
        <Select value={theme} onValueChange={(v) => handleThemeChange(v as ThemeMode)}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="system">System</SelectItem>
            <SelectItem value="light">Light</SelectItem>
            <SelectItem value="dark">Dark</SelectItem>
          </SelectContent>
        </Select>
      </SettingRow>

      {/* Row 6: Mod Sort Order */}
      <SettingRow>
        <IconBox colorClass="bg-emerald-500/10">
          <SortAsc className="h-5 w-5 text-emerald-500" />
        </IconBox>
        <div className="flex-1 min-w-0">
          <span className="text-sm font-medium">Mod Sort Order</span>
          <p className="text-xs text-muted-foreground">
            {modSortOrder === 'name' ? 'Name (default)' : modSortOrder === 'type' ? 'Type' : 'Size'}
          </p>
        </div>
        <Select value={modSortOrder} onValueChange={(v) => handleSortOrderChange(v as ModSortOrder)}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="name">Name</SelectItem>
            <SelectItem value="type">Type</SelectItem>
            <SelectItem value="size">Size</SelectItem>
          </SelectContent>
        </Select>
      </SettingRow>

      {/* Row 7: About */}
      <SettingRow>
        <IconBox colorClass="bg-gray-500/10">
          <Info className="h-5 w-5 text-gray-500" />
        </IconBox>
        <div className="flex-1 min-w-0">
          <span className="text-sm font-medium">About Hymn</span>
          <p className="text-xs text-muted-foreground">
            Version {appVersion || '...'}
          </p>
        </div>
      </SettingRow>
    </div>
  )
}
