import {
  CheckCircle,
  ExternalLink,
  FolderOpen,
  HardDrive,
  Monitor,
  Moon,
  Palette,
  Settings2,
  SortAsc,
  Sun,
  XCircle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
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
import { useInstallInfo, useTheme, useModSortOrder, useDefaultExportPath } from '@/hooks/queries'
import {
  useSelectInstallPath,
  useSetTheme,
  useSetModSortOrder,
  useSetDefaultExportPath,
  useSelectDefaultExportPath,
} from '@/hooks/mutations'

export function SettingsSection() {
  // React Query data
  const { data: installInfo } = useInstallInfo()
  const { data: theme = 'system' } = useTheme()
  const { data: modSortOrder = 'name' } = useModSortOrder()
  const { data: defaultExportPath = null } = useDefaultExportPath()

  // Mutations
  const selectInstallPath = useSelectInstallPath()
  const setTheme = useSetTheme()
  const setModSortOrder = useSetModSortOrder()
  const setDefaultExportPath = useSetDefaultExportPath()
  const selectDefaultExportPath = useSelectDefaultExportPath()

  const handleThemeChange = (value: ThemeMode) => {
    setTheme.mutate(value)
  }

  const handleSortOrderChange = (value: ModSortOrder) => {
    setModSortOrder.mutate(value)
  }

  const handleSelectExportPath = () => {
    selectDefaultExportPath.mutate()
  }

  const handleClearExportPath = () => {
    setDefaultExportPath.mutate(null)
  }

  return (
    <div className="space-y-6">
      {/* Install Location Card */}
      <Card className="overflow-hidden rounded-xl border-border/40 bg-card/80">
          <CardHeader className="border-b border-border/30 bg-muted/20">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <HardDrive className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-base">Install Location</CardTitle>
                <CardDescription>Hytale installation path</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-5 space-y-4">
            {/* Status */}
            <div className="flex items-center gap-3">
              <div className={cn(
                'flex h-8 w-8 items-center justify-center rounded-lg',
                installInfo?.activePath ? 'bg-success/10' : 'bg-destructive/10'
              )}>
                {installInfo?.activePath ? (
                  <CheckCircle className="h-4 w-4 text-success" />
                ) : (
                  <XCircle className="h-4 w-4 text-destructive" />
                )}
              </div>
              <div>
                <p className="text-sm font-medium">
                  {installInfo?.activePath ? 'Installation detected' : 'Not configured'}
                </p>
                <p className="text-xs text-muted-foreground">
                  {installInfo?.activePath ? 'Ready to manage mods' : 'Select your Hytale folder'}
                </p>
              </div>
            </div>

            {/* Path display */}
            {installInfo?.activePath && (
              <div className="rounded-lg bg-muted/50 p-3">
                <p className="font-mono text-xs text-muted-foreground break-all">
                  {installInfo.activePath}
                </p>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => selectInstallPath.mutate()}
                disabled={selectInstallPath.isPending}
                className="flex-1 h-10"
              >
                <FolderOpen className="mr-2 h-4 w-4" />
                {installInfo?.activePath ? 'Change' : 'Select Folder'}
              </Button>
              {installInfo?.activePath && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-10 w-10"
                  onClick={() => window.hymn.openInExplorer(installInfo.activePath!)}
                >
                  <ExternalLink className="h-4 w-4" />
                </Button>
              )}
            </div>

            {/* Subfolders */}
            {installInfo && (
              <div className="space-y-2 pt-2 border-t border-border/50">
                <p className="text-xs font-medium text-muted-foreground">Detected folders</p>
                <div className="grid gap-1.5">
                  {[
                    { label: 'Packs', path: installInfo.packsPath },
                    { label: 'Mods', path: installInfo.modsPath },
                    { label: 'Early Plugins', path: installInfo.earlyPluginsPath },
                  ].map(({ label, path }) => (
                    <div key={label} className="flex items-center gap-2 text-xs">
                      <div className={cn(
                        'h-1.5 w-1.5 rounded-full',
                        path ? 'bg-success' : 'bg-muted-foreground/30'
                      )} />
                      <span className="text-muted-foreground">{label}:</span>
                      <span className={path ? '' : 'text-muted-foreground/50'}>
                        {path ? 'Found' : 'Not found'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

      {/* Appearance Card */}
      <Card className="overflow-hidden rounded-xl border-border/40 bg-card/80">
        <CardHeader className="border-b border-border/30 bg-muted/20">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-500/10">
              <Palette className="h-5 w-5 text-violet-400" />
            </div>
            <div>
              <CardTitle className="text-base">Appearance</CardTitle>
              <CardDescription>Customize the look and feel</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted/50">
                {theme === 'light' ? (
                  <Sun className="h-4 w-4 text-amber-500" />
                ) : theme === 'dark' ? (
                  <Moon className="h-4 w-4 text-blue-400" />
                ) : (
                  <Monitor className="h-4 w-4 text-muted-foreground" />
                )}
              </div>
              <div>
                <p className="text-sm font-medium">Theme</p>
                <p className="text-xs text-muted-foreground">Select your preferred color scheme</p>
              </div>
            </div>
            <Select value={theme} onValueChange={(v) => handleThemeChange(v as ThemeMode)}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="light">
                  <div className="flex items-center gap-2">
                    <Sun className="h-4 w-4" />
                    Light
                  </div>
                </SelectItem>
                <SelectItem value="dark">
                  <div className="flex items-center gap-2">
                    <Moon className="h-4 w-4" />
                    Dark
                  </div>
                </SelectItem>
                <SelectItem value="system">
                  <div className="flex items-center gap-2">
                    <Monitor className="h-4 w-4" />
                    System
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Preferences Card */}
      <Card className="overflow-hidden rounded-xl border-border/40 bg-card/80">
        <CardHeader className="border-b border-border/30 bg-muted/20">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10">
              <Settings2 className="h-5 w-5 text-emerald-400" />
            </div>
            <div>
              <CardTitle className="text-base">Preferences</CardTitle>
              <CardDescription>Configure application behavior</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-5 space-y-6">
          {/* Mod Sort Order */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted/50">
                <SortAsc className="h-4 w-4 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm font-medium">Sort mods by</p>
                <p className="text-xs text-muted-foreground">Default sorting for mod lists</p>
              </div>
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
          </div>

          {/* Default Export Path */}
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted/50">
                <FolderOpen className="h-4 w-4 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm font-medium">Default export folder</p>
                <p className="text-xs text-muted-foreground">Where to save exported modpacks</p>
              </div>
            </div>
            {defaultExportPath ? (
              <div className="flex items-center gap-2">
                <div className="flex-1 rounded-lg bg-muted/50 p-3">
                  <p className="font-mono text-xs text-muted-foreground break-all">
                    {defaultExportPath}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSelectExportPath}
                >
                  Change
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClearExportPath}
                >
                  Clear
                </Button>
              </div>
            ) : (
              <Button
                variant="outline"
                onClick={handleSelectExportPath}
                className="w-full"
              >
                <FolderOpen className="mr-2 h-4 w-4" />
                Select Folder
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
