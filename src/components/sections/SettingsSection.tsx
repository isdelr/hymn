import {
  HardDrive,
  Palette,
  SortAsc,
  Server,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import type { ThemeMode, ModSortOrder } from '@/shared/hymn-types'

// React Query hooks
import { useInstallInfo, useTheme, useModSortOrder, useServerJarPath, useDependencies } from '@/hooks/queries'
import {
  useSelectInstallPath,
  useSetTheme,
  useSetModSortOrder,
  useSelectServerJarPath,
  useSetServerJarPath,
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

  // Get the effective server jar path - either custom setting or resolved from dependencies
  const effectiveServerJarPath = serverJarPath || dependencies?.hytale?.serverJarPath || null
  const isUsingDefaultPath = !serverJarPath && !!dependencies?.hytale?.serverJarPath

  // Mutations
  const selectInstallPath = useSelectInstallPath()
  const setTheme = useSetTheme()
  const setModSortOrder = useSetModSortOrder()
  const selectServerJarPath = useSelectServerJarPath()
  const setServerJarPath = useSetServerJarPath()

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

  return (
    <div className="space-y-1">
      {/* Row 1: Install Location */}
      <SettingRow>
        <IconBox colorClass="bg-primary/10">
          <HardDrive className="h-5 w-5 text-primary" />
        </IconBox>
        <div className="flex-1 min-w-0">
          <div className="flex items-center">
            <span className="text-sm font-medium">Install Location</span>
            <StatusDot active={!!installInfo?.activePath} />
          </div>
          <p className="text-xs text-muted-foreground truncate">
            {installInfo?.activePath
              ? truncatePath(installInfo.activePath)
              : 'Not configured'}
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

      {/* Row 3: Theme */}
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

      {/* Row 4: Mod Sort Order */}
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
    </div>
  )
}
