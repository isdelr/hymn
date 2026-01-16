import { useMemo, useState } from 'react'
import {
  AlertTriangle,
  Package,
  Plus,
  RefreshCw,
  Search,
  X,
  Archive,
  Puzzle,
  Zap,
  Trash2,
  Globe,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
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
import { useAppContext } from '@/context/AppContext'
import { typeLabels, formatLabels, locationLabels } from '@/shared/labels'
import { cn } from '@/lib/utils'
import type { ModEntry } from '@/shared/hymn-types'

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
        badge: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
        icon: 'text-emerald-400',
        glow: 'group-hover:shadow-emerald-500/10',
      }
    case 'plugin':
      return {
        badge: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
        icon: 'text-blue-400',
        glow: 'group-hover:shadow-blue-500/10',
      }
    case 'early-plugin':
      return {
        badge: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
        icon: 'text-amber-400',
        glow: 'group-hover:shadow-amber-500/10',
      }
    default:
      return {
        badge: 'bg-muted text-muted-foreground',
        icon: 'text-muted-foreground',
        glow: '',
      }
  }
}

export function ModsSection() {
  const {
    state,
    actions,
    selectedWorld,
    enabledModIds,
  } = useAppContext()
  const {
    installInfo,
    scanResult,
    worldsState,
    isScanning,
    errorMessage,
    worldError,
    isTogglingMod,
  } = state

  const [filter, setFilter] = useState('')
  const [modToDelete, setModToDelete] = useState<ModEntry | null>(null)

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
    await actions.handleDeleteMod(modToDelete)
    setModToDelete(null)
  }

  const worlds = worldsState?.worlds ?? []
  const hasWorlds = worlds.length > 0

  return (
    <div className="space-y-5">
      {/* World Selector */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Globe className="h-4 w-4" />
          <span>Managing mods for:</span>
        </div>
        {hasWorlds ? (
          <Select
            value={selectedWorld?.id ?? ''}
            onValueChange={(worldId) => actions.handleSelectWorld(worldId)}
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
      </div>

      {/* Error message */}
      {worldError && (
        <div className="flex items-center gap-3 rounded-xl bg-destructive/10 border border-destructive/20 px-4 py-3">
          <AlertTriangle className="h-4 w-4 text-destructive shrink-0" />
          <p className="text-sm text-destructive">{worldError}</p>
        </div>
      )}

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
          onClick={actions.handleAddMods}
          disabled={isScanning || isTogglingMod || !installInfo?.activePath}
          className="h-10 gap-2 border-border/50"
        >
          <Plus className="h-4 w-4" />
          Add Mods
        </Button>
        <Button
          variant="outline"
          size="default"
          onClick={actions.runScan}
          disabled={isScanning || isTogglingMod || !installInfo?.activePath}
          className="h-10 gap-2 border-border/50"
        >
          <RefreshCw className={cn('h-4 w-4', isScanning && 'animate-spin')} />
          {isScanning ? 'Scanning' : 'Rescan'}
        </Button>
      </div>

      {/* Scan Error */}
      {errorMessage && (
        <div className="flex items-center gap-3 rounded-xl bg-destructive/10 border border-destructive/20 px-4 py-3">
          <AlertTriangle className="h-4 w-4 text-destructive shrink-0" />
          <p className="text-sm text-destructive">{errorMessage}</p>
        </div>
      )}

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
                  'group relative rounded-xl border bg-card transition-all duration-200',
                  isEnabled
                    ? 'border-primary/40 bg-primary/5 shadow-lg shadow-primary/5'
                    : 'border-border/50 hover:border-border hover:shadow-md hover:shadow-black/10',
                  colors.glow
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
                              onCheckedChange={(checked) => actions.handleToggleMod(entry, checked)}
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

                  {/* Footer */}
                  <div className="mt-3 flex items-center justify-between">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Badge variant="outline" className={cn('text-[10px] font-medium', colors.badge)}>
                        {typeLabels[entry.type]}
                      </Badge>
                      <Badge variant="outline" className="text-[10px] bg-muted/30">
                        {formatLabels[entry.format]}
                      </Badge>
                      {entry.version && (
                        <span className="text-[10px] text-muted-foreground">v{entry.version}</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Location bar */}
                <div className="border-t border-border/30 bg-muted/20 px-4 py-2">
                  <p className="truncate text-[10px] text-muted-foreground">
                    {locationLabels[entry.location]}
                  </p>
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
