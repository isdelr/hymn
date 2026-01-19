import { useMemo, useState } from 'react'
import {
  AlertTriangle,
  Package,
  Plus,
  Search,
  X,
  Archive,
  Puzzle,
  Zap,
  Trash2,
  Globe,
  HardDrive,
  Link2,
  PackagePlus,
  Download,
  Upload,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { typeLabels, formatLabels, locationLabels } from '@/shared/labels'
import { cn } from '@/lib/utils'
import type { ModEntry } from '@/shared/hymn-types'

// React Query hooks
import { useInstallInfo, useWorlds, useMods } from '@/hooks/queries'
import {
  useToggleMod,
  useDeleteMod,
  useAddMods,
  useSelectWorld,
  useExportWorldMods,
  useImportWorldMods,
} from '@/hooks/mutations'

const getModIcon = (type: ModEntry['type']) => {
  switch (type) {
    case 'pack':
      return Package
    case 'plugin':
      return Puzzle
    case 'early-plugin':
      return Zap
    default:
      return Archive
  }
}

const getModColors = (type: ModEntry['type']) => {
  switch (type) {
    case 'pack':
      return {
        badge: 'bg-primary/15 text-primary border-primary/30',
        icon: 'text-primary',
        glow: 'group-hover:shadow-primary/10',
        accent: 'from-primary',
      }
    case 'plugin':
      return {
        badge: 'bg-secondary/15 text-secondary border-secondary/30',
        icon: 'text-secondary',
        glow: 'group-hover:shadow-secondary/10',
        accent: 'from-secondary',
      }
    case 'early-plugin':
      return {
        badge: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
        icon: 'text-amber-400',
        glow: 'group-hover:shadow-amber-500/10',
        accent: 'from-amber-400',
      }
    default:
      return {
        badge: 'bg-muted text-muted-foreground',
        icon: 'text-muted-foreground',
        glow: '',
        accent: 'from-muted-foreground',
      }
  }
}

const formatFileSize = (bytes: number | undefined): string => {
  if (bytes === undefined) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function ModsSection() {
  // React Query data
  const { data: installInfo } = useInstallInfo()
  const { data: worldsState } = useWorlds(!!installInfo?.activePath)
  const selectedWorldId = worldsState?.selectedWorldId ?? null
  const { data: scanResult, isLoading: isScanning } = useMods(selectedWorldId)

  // Mutations
  const toggleMod = useToggleMod()
  const deleteMod = useDeleteMod()
  const addMods = useAddMods()
  const selectWorld = useSelectWorld()
  const exportWorldMods = useExportWorldMods()
  const importWorldMods = useImportWorldMods()

  const [filter, setFilter] = useState('')
  const [modToDelete, setModToDelete] = useState<ModEntry | null>(null)

  // Derived state
  const isTogglingMod = toggleMod.isPending || deleteMod.isPending || addMods.isPending || selectWorld.isPending
  const selectedWorld = worldsState?.worlds.find((w) => w.id === selectedWorldId) ?? null
  const enabledModIds = useMemo(() => {
    const entries = scanResult?.entries ?? []
    return new Set(entries.filter((entry) => entry.enabled).map((entry) => entry.id))
  }, [scanResult])

  const visibleEntries = useMemo(() => {
    const entries = scanResult?.entries ?? []
    if (!filter.trim()) return entries
    const lowered = filter.toLowerCase()
    return entries.filter((entry) => {
      return [entry.name, entry.group, entry.id]
        .filter(Boolean)
        .some((value) => value?.toLowerCase().includes(lowered))
    })
  }, [filter, scanResult])

  const handleDeleteMod = async () => {
    if (!modToDelete) return
    await deleteMod.mutateAsync({ entry: modToDelete, worldId: selectedWorldId })
    setModToDelete(null)
  }

  const handleExportWorldMods = async () => {
    if (!selectedWorld) return
    exportWorldMods.mutate(selectedWorld.id)
  }

  const handleImportWorldMods = async () => {
    importWorldMods.mutate()
  }

  const worlds = worldsState?.worlds ?? []
  const hasWorlds = worlds.length > 0

  return (
    <div className="space-y-5">
      {/* World Selector */}
      <div className="flex flex-wrap items-center gap-3 mb-10">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Globe className="h-4 w-4" />
          <span>Managing mods for world:</span>
        </div>
        {hasWorlds ? (
          <Select
            value={selectedWorld?.id ?? ''}
            onValueChange={(worldId) => selectWorld.mutate(worldId)}
            disabled={isScanning || isTogglingMod}
          >
            <SelectTrigger className="w-[220px] h-10 bg-muted/30 border-border/50">
              <SelectValue placeholder="Select a world..." />
            </SelectTrigger>
            <SelectContent>
              {worlds.map((world) => (
                <SelectItem key={world.id} value={world.id}>
                  <div className="flex items-center gap-2">
                    {world.previewDataUrl ? (
                      <img
                        src={world.previewDataUrl}
                        alt=""
                        className="w-6 h-6 rounded object-cover"
                      />
                    ) : (
                      <div className="w-6 h-6 rounded bg-muted flex items-center justify-center">
                        <Globe className="h-3 w-3 text-muted-foreground" />
                      </div>
                    )}
                    <span>{world.name}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <div className="text-sm text-muted-foreground italic">
            No worlds found. Create a world in Hytale first.
          </div>
        )}

        {/* Export/Import Buttons */}
        <div className="flex items-center gap-1.5">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleExportWorldMods}
            disabled={exportWorldMods.isPending || importWorldMods.isPending || !selectedWorld || isScanning}
            className="h-8 w-8"
          >
            <Download className={cn("h-4 w-4", exportWorldMods.isPending && "animate-pulse")} />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleImportWorldMods}
            disabled={exportWorldMods.isPending || importWorldMods.isPending || isScanning || !installInfo?.activePath}
            className="h-8 w-8"
          >
            <Upload className={cn("h-4 w-4", importWorldMods.isPending && "animate-pulse")} />
          </Button>
        </div>
      </div>

      {/* Search & Actions Bar */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/70" />
          <Input
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Search mods by name, group, or ID..."
            className="h-10 pl-10 pr-10 bg-muted/30 border-border/50 focus:bg-muted/50"
          />
          {filter && (
            <button
              onClick={() => setFilter('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-0.5 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <Button
          variant="outline"
          size="default"
          onClick={() => addMods.mutate(selectedWorldId)}
          disabled={isScanning || isTogglingMod || !installInfo?.activePath}
          className="h-10 gap-2 border-border/50"
        >
          <Plus className="h-4 w-4" />
          Add Mods
        </Button>
      </div>

      {/* No World Selected Warning */}
      {!selectedWorld && hasWorlds && (
        <div className="flex items-center gap-3 rounded-xl bg-warning/10 border border-warning/20 px-4 py-3">
          <AlertTriangle className="h-4 w-4 text-warning shrink-0" />
          <p className="text-sm text-warning">Please select a world to manage mods.</p>
        </div>
      )}

      {/* Mods Grid */}
      {visibleEntries.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border/50 bg-muted/20 py-20">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-muted/50">
            <Package className="h-8 w-8 text-muted-foreground/50" />
          </div>
          <h3 className="mb-2 text-lg font-medium">No mods found</h3>
          <p className="max-w-sm text-center text-sm text-muted-foreground">
            {filter
              ? 'No mods match your search. Try different keywords.'
              : installInfo?.activePath
              ? 'Click "Add Mods" to import mods, or add them to your Mods folder and click Rescan.'
              : 'Select your Hytale folder to get started.'}
          </p>
          {filter && (
            <Button variant="ghost" size="sm" onClick={() => setFilter('')} className="mt-4">
              Clear search
            </Button>
          )}
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {visibleEntries.map((entry) => {
            const isEnabled = enabledModIds.has(entry.id)
            const colors = getModColors(entry.type)
            const ModIcon = getModIcon(entry.type)
            const canToggle = !!selectedWorld && !isTogglingMod

            return (
              <div
                key={`${entry.location}-${entry.path}`}
                className={cn(
                  'group relative overflow-hidden rounded-xl border border-border/40 bg-card/80 transition-colors duration-200',
                  'hover:border-primary/60 hover:bg-card',
                  isEnabled && 'border-primary/50 bg-primary/5'
                )}
              >

                <div className="p-4">
                  {/* Header */}
                  <div className="flex items-start gap-3">
                    {/* Icon */}
                    <div className={cn(
                      'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted/50 transition-colors',
                      isEnabled && 'bg-primary/10'
                    )}>
                      <ModIcon className={cn('h-5 w-5', colors.icon)} />
                    </div>

                    {/* Content */}
                    <div className="min-w-0 flex-1">
                      <h3 className="truncate font-medium leading-tight">{entry.name}</h3>
                      <p className="mt-0.5 truncate text-xs text-muted-foreground">{entry.id}</p>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      {/* Delete Button */}
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            onClick={() => setModToDelete(entry)}
                            disabled={isTogglingMod}
                            className={cn(
                              'flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors',
                              'opacity-0 group-hover:opacity-100',
                              isTogglingMod && 'cursor-not-allowed opacity-50'
                            )}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent side="top">
                          <p className="text-xs">Delete mod</p>
                        </TooltipContent>
                      </Tooltip>

                      {/* Toggle */}
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div>
                            <Switch
                              checked={isEnabled}
                              disabled={!canToggle}
                              onCheckedChange={(checked) =>
                                toggleMod.mutate({
                                  worldId: selectedWorld!.id,
                                  entry,
                                  enabled: checked,
                                })
                              }
                              aria-label={`Toggle ${entry.name}`}
                              className="shrink-0"
                            />
                          </div>
                        </TooltipTrigger>
                        {!selectedWorld && (
                          <TooltipContent side="top">
                            <p className="text-xs">Select a world to toggle mods</p>
                          </TooltipContent>
                        )}
                      </Tooltip>
                    </div>
                  </div>

                  {/* Badges Row */}
                  <div className="mt-3 flex flex-wrap items-center gap-1.5">
                    <Badge variant="outline" className={cn('text-[10px] font-medium', colors.badge)}>
                      {typeLabels[entry.type]}
                    </Badge>
                    <Badge variant="outline" className="text-[10px] bg-muted/30">
                      {formatLabels[entry.format]}
                    </Badge>
                    {entry.type === 'plugin' && entry.includesAssetPack && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Badge variant="outline" className="text-[10px] bg-purple-500/15 text-purple-400 border-purple-500/30 gap-1">
                            <PackagePlus className="h-2.5 w-2.5" />
                            Assets
                          </Badge>
                        </TooltipTrigger>
                        <TooltipContent side="top">
                          <p className="text-xs">Includes bundled asset pack</p>
                        </TooltipContent>
                      </Tooltip>
                    )}
                    {entry.version && (
                      <span className="text-[10px] text-muted-foreground">v{entry.version}</span>
                    )}
                  </div>

                  {/* Dependencies Row */}
                  {entry.dependencies.length > 0 && (
                    <div className="mt-2 flex items-start gap-1.5">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                            <Link2 className="h-3 w-3 shrink-0" />
                            <span className="truncate">
                              {entry.dependencies.length === 1
                                ? entry.dependencies[0]
                                : `${entry.dependencies.length} dependencies`}
                            </span>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="max-w-xs">
                          <p className="text-xs font-medium mb-1">Required Dependencies:</p>
                          <ul className="text-xs text-muted-foreground space-y-0.5">
                            {entry.dependencies.map((dep) => (
                              <li key={dep}>{dep}</li>
                            ))}
                          </ul>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                  )}
                </div>

                {/* Location & Size bar */}
                <div className="border-t border-border/30 bg-muted/20 px-4 py-2 flex items-center justify-between">
                  <p className="truncate text-[10px] text-muted-foreground">
                    {locationLabels[entry.location]}
                  </p>
                  {entry.size !== undefined && (
                    <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                      <HardDrive className="h-3 w-3" />
                      <span>{formatFileSize(entry.size)}</span>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!modToDelete} onOpenChange={(open) => !open && setModToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Mod Permanently?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete "{modToDelete?.name}" from your Hytale installation.
              A backup will be created in Hymn's data folder, but this action cannot be easily undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDeleteMod}
            >
              Delete Permanently
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
