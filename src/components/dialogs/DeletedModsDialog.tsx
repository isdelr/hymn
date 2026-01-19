import { useState } from 'react'
import { Trash2, RotateCcw, Archive, HardDrive, AlertTriangle } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { formatLabels, locationLabels } from '@/shared/labels'
import type { DeletedModEntry, ModLocation } from '@/shared/hymn-types'
import { useDeletedMods } from '@/hooks/queries'
import { useRestoreDeletedMod, usePermanentlyDeleteMod, useClearDeletedMods } from '@/hooks/mutations'

interface DeletedModsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

const formatDate = (isoString: string): string => {
  const date = new Date(isoString)
  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function DeletedModsDialog({ open, onOpenChange }: DeletedModsDialogProps) {
  const { data: deletedMods = [], isLoading } = useDeletedMods()
  const restoreMod = useRestoreDeletedMod()
  const permanentlyDelete = usePermanentlyDeleteMod()
  const clearAll = useClearDeletedMods()

  const [modToRestore, setModToRestore] = useState<DeletedModEntry | null>(null)
  const [restoreLocation, setRestoreLocation] = useState<ModLocation>('mods')
  const [modToDelete, setModToDelete] = useState<DeletedModEntry | null>(null)
  const [showClearAllConfirm, setShowClearAllConfirm] = useState(false)

  const handleRestore = async () => {
    if (!modToRestore) return
    await restoreMod.mutateAsync({
      backupId: modToRestore.id,
      targetLocation: restoreLocation,
    })
    setModToRestore(null)
  }

  const handlePermanentDelete = async () => {
    if (!modToDelete) return
    await permanentlyDelete.mutateAsync(modToDelete.id)
    setModToDelete(null)
  }

  const handleClearAll = async () => {
    await clearAll.mutateAsync()
    setShowClearAllConfirm(false)
  }

  const isWorking = restoreMod.isPending || permanentlyDelete.isPending || clearAll.isPending

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-xl max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Trash2 className="h-5 w-5" />
              Deleted Mods
            </DialogTitle>
            <DialogDescription>
              Mods you've deleted are backed up here. Restore them to any mod folder or permanently delete them.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto min-h-0">
            {isLoading ? (
              <div className="flex items-center justify-center py-12 text-muted-foreground">
                Loading...
              </div>
            ) : deletedMods.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-muted/50">
                  <Archive className="h-7 w-7 text-muted-foreground/50" />
                </div>
                <p className="text-sm text-muted-foreground">No deleted mods in backup.</p>
                <p className="text-xs text-muted-foreground/70 mt-1">
                  Deleted mods will appear here for recovery.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {deletedMods.map((mod) => (
                  <div
                    key={mod.id}
                    className="flex items-center gap-3 p-3 rounded-lg border border-border/50 bg-muted/20 hover:bg-muted/30 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium truncate">{mod.originalName}</span>
                        <Badge variant="outline" className="text-[10px] shrink-0">
                          {formatLabels[mod.format]}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                        <span>{formatDate(mod.deletedAt)}</span>
                        <div className="flex items-center gap-1">
                          <HardDrive className="h-3 w-3" />
                          <span>{formatFileSize(mod.size)}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-emerald-500 hover:text-emerald-400 hover:bg-emerald-500/10"
                            onClick={() => {
                              setModToRestore(mod)
                              setRestoreLocation('mods')
                            }}
                            disabled={isWorking}
                          >
                            <RotateCcw className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Restore mod</TooltipContent>
                      </Tooltip>

                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={() => setModToDelete(mod)}
                            disabled={isWorking}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Delete permanently</TooltipContent>
                      </Tooltip>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {deletedMods.length > 0 && (
            <div className="flex items-center justify-between pt-4 border-t border-border/50">
              <Button
                variant="ghost"
                size="sm"
                className="text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={() => setShowClearAllConfirm(true)}
                disabled={isWorking}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Clear All
              </Button>
              <Button variant="ghost" onClick={() => onOpenChange(false)}>
                Close
              </Button>
            </div>
          )}

          {deletedMods.length === 0 && (
            <div className="flex justify-end pt-4 border-t border-border/50">
              <Button variant="ghost" onClick={() => onOpenChange(false)}>
                Close
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Restore Confirmation Dialog */}
      <AlertDialog open={!!modToRestore} onOpenChange={(open) => !open && setModToRestore(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Restore Mod</AlertDialogTitle>
            <AlertDialogDescription>
              Choose where to restore "{modToRestore?.originalName}".
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="py-4">
            <Select value={restoreLocation} onValueChange={(v) => setRestoreLocation(v as ModLocation)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="mods">{locationLabels.mods}</SelectItem>
                <SelectItem value="packs">{locationLabels.packs}</SelectItem>
                <SelectItem value="earlyplugins">{locationLabels.earlyplugins}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRestore}
              disabled={restoreMod.isPending}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              Restore
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Permanent Delete Confirmation Dialog */}
      <AlertDialog open={!!modToDelete} onOpenChange={(open) => !open && setModToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Backup Permanently?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the backup for "{modToDelete?.originalName}".
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handlePermanentDelete}
              disabled={permanentlyDelete.isPending}
            >
              Delete Permanently
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Clear All Confirmation Dialog */}
      <AlertDialog open={showClearAllConfirm} onOpenChange={setShowClearAllConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Clear All Backups?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete all {deletedMods.length} backup{deletedMods.length === 1 ? '' : 's'}.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleClearAll}
              disabled={clearAll.isPending}
            >
              Clear All
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
