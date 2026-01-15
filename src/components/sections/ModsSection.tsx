import { useMemo, useState } from 'react'
import {
  AlertTriangle,
  Check,
  CircleDot,
  Lock,
  Package,
  Plus,
  RefreshCw,
  Search,
  X,
  Archive,
  Puzzle,
  Zap,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Switch } from '@/components/ui/switch'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
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
    activeProfile,
    enabledModIds,
    warnings,
    profileWarnings,
  } = useAppContext()
  const {
    installInfo,
    scanResult,
    isScanning,
    errorMessage,
    profilesState,
    profileError,
    isSwitchingProfile,
  } = state

  const [filter, setFilter] = useState('')
  const [isCreatingProfile, setIsCreatingProfile] = useState(false)
  const [newProfileName, setNewProfileName] = useState('')

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

  const handleCreateProfile = async () => {
    if (!newProfileName.trim()) return
    await actions.handleCreateProfile(newProfileName.trim())
    setNewProfileName('')
    setIsCreatingProfile(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleCreateProfile()
    } else if (e.key === 'Escape') {
      setIsCreatingProfile(false)
      setNewProfileName('')
    }
  }

  const totalWarnings = warnings.length + profileWarnings.length

  return (
    <div className="space-y-5">
      {/* Profile Tabs */}
      <div className="flex flex-wrap items-center gap-2">
        {profilesState?.profiles.map((profile) => {
          const isActive = profile.id === profilesState.activeProfileId
          const isDefault = profile.readonly
          return (
            <button
              key={profile.id}
              onClick={() => actions.handleActivateProfile(profile.id)}
              disabled={isSwitchingProfile || isScanning}
              className={cn(
                'inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all',
                isActive
                  ? isDefault
                    ? 'bg-amber-500/20 text-amber-300 shadow-lg shadow-amber-500/10'
                    : 'bg-primary text-primary-foreground shadow-lg shadow-primary/20'
                  : 'bg-muted/40 text-muted-foreground hover:bg-muted/60 hover:text-foreground',
                (isSwitchingProfile || isScanning) && 'opacity-50 cursor-wait'
              )}
            >
              {isDefault && <Lock className="h-3 w-3" />}
              {profile.name}
            </button>
          )
        })}

        {/* Create New Profile */}
        {isCreatingProfile ? (
          <div className="flex items-center gap-2">
            <Input
              value={newProfileName}
              onChange={(e) => setNewProfileName(e.target.value)}
              onKeyDown={handleKeyDown}
              onBlur={() => {
                if (!newProfileName.trim()) {
                  setIsCreatingProfile(false)
                }
              }}
              placeholder="Profile name..."
              className="h-9 w-40 text-sm bg-muted/40 border-border/50"
              autoFocus
            />
            <button
              onClick={handleCreateProfile}
              disabled={!newProfileName.trim()}
              className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Check className="h-4 w-4" />
            </button>
            <button
              onClick={() => {
                setIsCreatingProfile(false)
                setNewProfileName('')
              }}
              className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted/40 text-muted-foreground hover:bg-muted/60 hover:text-foreground transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <button
            onClick={() => setIsCreatingProfile(true)}
            disabled={isSwitchingProfile || isScanning}
            className={cn(
              'flex h-9 w-9 items-center justify-center rounded-lg bg-muted/40 text-muted-foreground hover:bg-muted/60 hover:text-foreground transition-colors',
              (isSwitchingProfile || isScanning) && 'opacity-50 cursor-wait'
            )}
            title="Create new profile"
          >
            <Plus className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Error message */}
      {profileError && (
        <div className="flex items-center gap-3 rounded-xl bg-destructive/10 border border-destructive/20 px-4 py-3">
          <AlertTriangle className="h-4 w-4 text-destructive shrink-0" />
          <p className="text-sm text-destructive">{profileError}</p>
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
          onClick={actions.runScan}
          disabled={isScanning || isSwitchingProfile || !installInfo?.activePath}
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
              ? 'Add mods to your Packs or Mods folder and click Rescan.'
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
            const isEnabled = activeProfile ? enabledModIds.has(entry.id) : entry.enabled
            const hasWarnings = entry.warnings.length > 0
            const colors = getModColors(entry.type)
            const ModIcon = getModIcon(entry.type)
            const isReadonly = activeProfile?.readonly

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
                      <div className="flex items-center gap-2">
                        <h3 className="truncate font-medium leading-tight">{entry.name}</h3>
                        {hasWarnings && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="flex h-5 w-5 items-center justify-center rounded-full bg-warning/20">
                                <AlertTriangle className="h-3 w-3 text-warning" />
                              </div>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="max-w-xs">
                              <ul className="space-y-1 text-xs">
                                {entry.warnings.map((warning, i) => (
                                  <li key={i}>{warning}</li>
                                ))}
                              </ul>
                            </TooltipContent>
                          </Tooltip>
                        )}
                      </div>
                      <p className="mt-0.5 truncate text-xs text-muted-foreground">{entry.id}</p>
                    </div>

                    {/* Toggle */}
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div>
                          <Switch
                            checked={isEnabled}
                            disabled={!activeProfile || isReadonly || isSwitchingProfile}
                            onCheckedChange={(checked) => actions.handleToggleMod(entry, checked)}
                            aria-label={`Toggle ${entry.name}`}
                            className="shrink-0"
                          />
                        </div>
                      </TooltipTrigger>
                      {isReadonly && (
                        <TooltipContent side="top">
                          <p className="text-xs">Create a new profile to modify mods</p>
                        </TooltipContent>
                      )}
                    </Tooltip>
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

      {/* Warnings Panel */}
      {totalWarnings > 0 && (
        <div className="rounded-xl border border-warning/30 bg-gradient-to-r from-warning/5 to-transparent p-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-warning/20">
              <AlertTriangle className="h-3.5 w-3.5 text-warning" />
            </div>
            <span className="text-sm font-medium text-warning">
              {totalWarnings} Warning{totalWarnings !== 1 && 's'}
            </span>
          </div>
          <ScrollArea className="max-h-28">
            <ul className="space-y-1.5">
              {[...warnings, ...profileWarnings].map((warning, i) => (
                <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                  <CircleDot className="mt-0.5 h-3 w-3 shrink-0 text-warning/50" />
                  {warning}
                </li>
              ))}
            </ul>
          </ScrollArea>
        </div>
      )}
    </div>
  )
}
