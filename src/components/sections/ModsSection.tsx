import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle,
  Check,
  ChevronDown,
  ChevronUp,
  CircleDot,
  FolderOpen,
  GripVertical,
  Layers,
  Package,
  Play,
  Plus,
  RefreshCw,
  RotateCcw,
  Search,
  X,
  Archive,
  Puzzle,
  Zap,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
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
    counts,
    warnings,
    profileWarnings,
    loadOrderEntries,
  } = useAppContext()
  const {
    installInfo,
    scanResult,
    isScanning,
    errorMessage,
    profilesState,
    profileError,
    applyMessage,
    applyError,
    applyWarnings,
    isApplying,
    isRollingBack,
  } = state

  const [filter, setFilter] = useState('')
  const [showLoadOrder, setShowLoadOrder] = useState(false)
  const [newProfileName, setNewProfileName] = useState('')
  const [profileNotes, setProfileNotes] = useState('')
  const [showApplyDialog, setShowApplyDialog] = useState(false)
  const [showRollbackDialog, setShowRollbackDialog] = useState(false)
  const [draggedId, setDraggedId] = useState<string | null>(null)
  const [dragOverId, setDragOverId] = useState<string | null>(null)

  useEffect(() => {
    setProfileNotes(activeProfile?.notes ?? '')
    actions.clearApplyMessages()
  }, [activeProfile?.id])

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

  const handleProfileNotesBlur = async () => {
    if (!activeProfile) return
    const nextNotes = profileNotes.trim()
    const currentNotes = activeProfile.notes ?? ''
    if (nextNotes === currentNotes) return
    await actions.handleUpdateProfile({
      ...activeProfile,
      notes: nextNotes.length ? nextNotes : undefined,
    })
  }

  const handleCreateProfile = async () => {
    if (!newProfileName.trim()) return
    await actions.handleCreateProfile(newProfileName.trim())
    setNewProfileName('')
  }

  const handleApply = async () => {
    setShowApplyDialog(false)
    await actions.handleApplyProfile()
  }

  const handleRollback = async () => {
    setShowRollbackDialog(false)
    await actions.handleRollback()
  }

  const handleDragStart = useCallback((e: React.DragEvent, id: string) => {
    setDraggedId(id)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', id)
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent, id: string) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOverId(id)
  }, [])

  const handleDragLeave = useCallback(() => {
    setDragOverId(null)
  }, [])

  const handleDrop = useCallback(
    async (e: React.DragEvent, targetId: string) => {
      e.preventDefault()
      setDragOverId(null)
      if (!draggedId || !activeProfile || draggedId === targetId) {
        setDraggedId(null)
        return
      }

      const currentOrder = [...activeProfile.loadOrder]
      const draggedIndex = currentOrder.indexOf(draggedId)
      const targetIndex = currentOrder.indexOf(targetId)

      if (draggedIndex === -1 || targetIndex === -1) {
        setDraggedId(null)
        return
      }

      currentOrder.splice(draggedIndex, 1)
      currentOrder.splice(targetIndex, 0, draggedId)

      await actions.handleUpdateProfile({
        ...activeProfile,
        loadOrder: currentOrder,
      })
      setDraggedId(null)
    },
    [draggedId, activeProfile, actions]
  )

  const handleDragEnd = useCallback(() => {
    setDraggedId(null)
    setDragOverId(null)
  }, [])

  const totalWarnings = warnings.length + profileWarnings.length + applyWarnings.length

  return (
    <div className="flex gap-6">
      {/* Main Content */}
      <div className="flex-1 space-y-5">
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
            disabled={isScanning || !installInfo?.activePath}
            className="h-10 gap-2 border-border/50"
          >
            <RefreshCw className={cn('h-4 w-4', isScanning && 'animate-spin')} />
            {isScanning ? 'Scanning' : 'Rescan'}
          </Button>
          <Button
            variant={showLoadOrder ? 'default' : 'outline'}
            size="default"
            onClick={() => setShowLoadOrder(!showLoadOrder)}
            className={cn('h-10 gap-2', !showLoadOrder && 'border-border/50')}
          >
            <Layers className="h-4 w-4" />
            Load Order
            {loadOrderEntries.length > 0 && (
              <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-[10px]">
                {loadOrderEntries.length}
              </Badge>
            )}
          </Button>
        </div>

        {/* Status Messages */}
        {errorMessage && (
          <div className="flex items-center gap-3 rounded-xl bg-destructive/10 border border-destructive/20 px-4 py-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-destructive/20">
              <AlertTriangle className="h-4 w-4 text-destructive" />
            </div>
            <p className="text-sm text-destructive">{errorMessage}</p>
          </div>
        )}

        {applyMessage && (
          <div className="flex items-center gap-3 rounded-xl bg-success/10 border border-success/20 px-4 py-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-success/20">
              <Check className="h-4 w-4 text-success" />
            </div>
            <p className="text-sm text-success">{applyMessage}</p>
          </div>
        )}

        {applyError && (
          <div className="flex items-center gap-3 rounded-xl bg-destructive/10 border border-destructive/20 px-4 py-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-destructive/20">
              <AlertTriangle className="h-4 w-4 text-destructive" />
            </div>
            <p className="text-sm text-destructive">{applyError}</p>
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
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {visibleEntries.map((entry) => {
              const isEnabled = activeProfile ? enabledModIds.has(entry.id) : entry.enabled
              const hasWarnings = entry.warnings.length > 0
              const colors = getModColors(entry.type)
              const ModIcon = getModIcon(entry.type)

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
                      <Switch
                        checked={isEnabled}
                        disabled={!activeProfile}
                        onCheckedChange={(checked) => actions.handleToggleMod(entry, checked)}
                        aria-label={`Toggle ${entry.name}`}
                        className="shrink-0"
                      />
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
          <Card className="border-warning/30 bg-gradient-to-r from-warning/5 to-transparent">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm">
                <div className="flex h-6 w-6 items-center justify-center rounded-md bg-warning/20">
                  <AlertTriangle className="h-3.5 w-3.5 text-warning" />
                </div>
                <span className="text-warning">{totalWarnings} Warning{totalWarnings !== 1 && 's'}</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <ScrollArea className="max-h-28">
                <ul className="space-y-1.5">
                  {[...warnings, ...profileWarnings, ...applyWarnings].map((warning, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                      <CircleDot className="mt-0.5 h-3 w-3 shrink-0 text-warning/50" />
                      {warning}
                    </li>
                  ))}
                </ul>
              </ScrollArea>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Sidebar */}
      <aside className="w-80 shrink-0 space-y-4">
        {/* Profile Selector */}
        <Card className="overflow-hidden">
          <CardHeader className="border-b border-border/50 bg-muted/30 pb-3">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Layers className="h-4 w-4 text-primary" />
              Profiles
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-4">
            {profileError && (
              <div className="rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive">
                {profileError}
              </div>
            )}

            {/* Profile chips */}
            <div className="flex flex-wrap gap-2">
              {profilesState?.profiles.length ? (
                profilesState.profiles.map((profile) => {
                  const isActive = profile.id === profilesState.activeProfileId
                  return (
                    <button
                      key={profile.id}
                      onClick={() => actions.handleActivateProfile(profile.id)}
                      className={cn(
                        'inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-all',
                        isActive
                          ? 'bg-primary text-primary-foreground shadow-md'
                          : 'bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground'
                      )}
                    >
                      {isActive && <CircleDot className="h-3 w-3" />}
                      {profile.name}
                    </button>
                  )
                })
              ) : (
                <p className="text-xs text-muted-foreground py-2">
                  Create a profile to start managing mods
                </p>
              )}
            </div>

            {/* Create new */}
            <div className="flex gap-2">
              <Input
                value={newProfileName}
                onChange={(e) => setNewProfileName(e.target.value)}
                placeholder="New profile name..."
                className="h-9 text-sm bg-muted/30"
                onKeyDown={(e) => e.key === 'Enter' && handleCreateProfile()}
              />
              <Button
                size="sm"
                variant="secondary"
                onClick={handleCreateProfile}
                disabled={!newProfileName.trim()}
                className="h-9 px-3"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Active Profile Panel */}
        {activeProfile && (
          <Card className="overflow-hidden border-primary/30">
            <CardHeader className="border-b border-border/50 bg-primary/5 pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold">{activeProfile.name}</CardTitle>
                <Badge className="bg-primary/20 text-primary border-0 text-[10px]">
                  {activeProfile.enabledMods.length} mod{activeProfile.enabledMods.length !== 1 && 's'}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              <Textarea
                value={profileNotes}
                onChange={(e) => setProfileNotes(e.target.value)}
                onBlur={handleProfileNotesBlur}
                placeholder="Add notes about this profile..."
                className="min-h-[70px] text-sm bg-muted/30 border-border/50 resize-none"
              />

              <div className="grid grid-cols-2 gap-2">
                <Button
                  onClick={() => setShowApplyDialog(true)}
                  disabled={!installInfo?.activePath || isApplying || isRollingBack || isScanning}
                  className="h-10 gap-2"
                >
                  <Play className="h-4 w-4" />
                  {isApplying ? 'Applying' : 'Apply'}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowRollbackDialog(true)}
                  disabled={isApplying || isRollingBack || isScanning}
                  className="h-10 gap-2"
                >
                  <RotateCcw className="h-4 w-4" />
                  {isRollingBack ? 'Rolling' : 'Rollback'}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Load Order Panel */}
        {showLoadOrder && activeProfile && (
          <Card>
            <CardHeader className="border-b border-border/50 bg-muted/30 pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">Load Order</CardTitle>
                <span className="text-[10px] text-muted-foreground font-medium">
                  Drag to reorder
                </span>
              </div>
            </CardHeader>
            <CardContent className="p-2">
              {loadOrderEntries.length === 0 ? (
                <div className="py-8 text-center">
                  <Layers className="mx-auto mb-2 h-8 w-8 text-muted-foreground/30" />
                  <p className="text-xs text-muted-foreground">
                    Enable mods to add them here
                  </p>
                </div>
              ) : (
                <ScrollArea className="max-h-72">
                  <div className="space-y-1 p-1">
                    {loadOrderEntries.map((entry, index) => (
                      <div
                        key={entry.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, entry.id)}
                        onDragOver={(e) => handleDragOver(e, entry.id)}
                        onDragLeave={handleDragLeave}
                        onDrop={(e) => handleDrop(e, entry.id)}
                        onDragEnd={handleDragEnd}
                        className={cn(
                          'flex items-center gap-2 rounded-lg border px-2 py-2 transition-all cursor-grab active:cursor-grabbing',
                          entry.missing
                            ? 'border-destructive/40 bg-destructive/10'
                            : dragOverId === entry.id
                            ? 'border-primary bg-primary/10 scale-[1.02]'
                            : 'border-border/50 bg-card hover:bg-muted/50',
                          draggedId === entry.id && 'opacity-40 scale-95'
                        )}
                      >
                        <GripVertical className="h-4 w-4 text-muted-foreground/50" />
                        <div className="flex h-6 w-6 items-center justify-center rounded-md bg-muted/50 text-xs font-medium text-muted-foreground">
                          {index + 1}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">{entry.name}</p>
                          <p className="truncate text-[10px] text-muted-foreground">
                            {entry.missing ? 'Missing from scan' : entry.typeLabel}
                          </p>
                        </div>
                        <div className="flex gap-0.5">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7"
                            onClick={() => actions.handleMoveLoadOrder(entry.id, 'up')}
                            disabled={index === 0 || isApplying || isRollingBack}
                          >
                            <ChevronUp className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7"
                            onClick={() => actions.handleMoveLoadOrder(entry.id, 'down')}
                            disabled={index === loadOrderEntries.length - 1 || isApplying || isRollingBack}
                          >
                            <ChevronDown className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        )}

        {/* Stats Card */}
        <Card className="bg-gradient-to-br from-muted/30 to-muted/10">
          <CardContent className="p-4">
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="rounded-lg bg-emerald-500/10 p-3">
                <p className="text-xl font-bold text-emerald-400">{counts.packs}</p>
                <p className="text-[10px] font-medium text-muted-foreground">Packs</p>
              </div>
              <div className="rounded-lg bg-blue-500/10 p-3">
                <p className="text-xl font-bold text-blue-400">{counts.plugins}</p>
                <p className="text-[10px] font-medium text-muted-foreground">Plugins</p>
              </div>
              <div className="rounded-lg bg-amber-500/10 p-3">
                <p className="text-xl font-bold text-amber-400">{counts.early}</p>
                <p className="text-[10px] font-medium text-muted-foreground">Early</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="mt-3 w-full text-xs h-8"
              onClick={() => window.hymn.openInExplorer(installInfo?.activePath ?? '')}
              disabled={!installInfo?.activePath}
            >
              <FolderOpen className="mr-2 h-3 w-3" />
              Open Install Folder
            </Button>
          </CardContent>
        </Card>
      </aside>

      {/* Apply Dialog */}
      <Dialog open={showApplyDialog} onOpenChange={setShowApplyDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                <Play className="h-5 w-5 text-primary" />
              </div>
              <div>
                <DialogTitle>Apply Profile</DialogTitle>
                <DialogDescription>
                  Update your mod configuration
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-3 py-4">
            <p className="text-sm text-muted-foreground">
              This will update your Hytale mod folders to match the <strong className="text-foreground">"{activeProfile?.name}"</strong> profile.
            </p>

            <div className="rounded-lg bg-muted/50 p-3 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Mods to enable</span>
                <span className="font-medium">{activeProfile?.enabledMods.length ?? 0}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Load order items</span>
                <span className="font-medium">{loadOrderEntries.length}</span>
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Archive className="h-3 w-3" />
              A backup will be created automatically
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="ghost" onClick={() => setShowApplyDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleApply} className="gap-2">
              <Play className="h-4 w-4" />
              Apply Profile
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rollback Dialog */}
      <Dialog open={showRollbackDialog} onOpenChange={setShowRollbackDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-warning/10">
                <RotateCcw className="h-5 w-5 text-warning" />
              </div>
              <div>
                <DialogTitle>Rollback Changes</DialogTitle>
                <DialogDescription>
                  Restore from the last backup
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="py-4">
            <p className="text-sm text-muted-foreground">
              This will restore your mod folders to the state before the last apply operation. Your current configuration will be replaced.
            </p>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="ghost" onClick={() => setShowRollbackDialog(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleRollback} className="gap-2">
              <RotateCcw className="h-4 w-4" />
              Rollback
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
