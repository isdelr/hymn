import { useEffect, useState } from 'react'
import {
  AlertTriangle,
  Archive,
  Check,
  Clock,
  Download,
  ExternalLink,
  FolderOpen,
  HardDrive,
  RefreshCw,
  Trash2,
  Upload,
  CheckCircle,
  XCircle,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useAppContext } from '@/context/AppContext'
import { cn } from '@/lib/utils'
import type { BackupInfo } from '@/shared/hymn-types'

export function SettingsSection() {
  const { state, actions, activeProfile } = useAppContext()
  const { installInfo, isScanning } = state

  const [backups, setBackups] = useState<BackupInfo[]>([])
  const [isLoadingBackups, setIsLoadingBackups] = useState(false)
  const [backupError, setBackupError] = useState<string | null>(null)
  const [backupMessage, setBackupMessage] = useState<string | null>(null)
  const [isRestoring, setIsRestoring] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [importExportMessage, setImportExportMessage] = useState<string | null>(null)
  const [importExportError, setImportExportError] = useState<string | null>(null)
  const [deleteBackupId, setDeleteBackupId] = useState<string | null>(null)
  const [restoreBackupId, setRestoreBackupId] = useState<string | null>(null)

  const loadBackups = async () => {
    setIsLoadingBackups(true)
    setBackupError(null)
    try {
      const list = await window.hymn.getBackups()
      setBackups(list)
    } catch {
      setBackupError('Failed to load backups.')
    } finally {
      setIsLoadingBackups(false)
    }
  }

  useEffect(() => {
    void loadBackups()
  }, [])

  const handleRestoreBackup = async () => {
    if (!restoreBackupId) return
    setIsRestoring(true)
    setBackupMessage(null)
    setBackupError(null)
    try {
      await window.hymn.restoreBackup(restoreBackupId)
      setBackupMessage(`Restored backup successfully.`)
      await actions.runScan()
    } catch (error) {
      setBackupError(error instanceof Error ? error.message : 'Failed to restore backup.')
    } finally {
      setIsRestoring(false)
      setRestoreBackupId(null)
    }
  }

  const handleDeleteBackup = async () => {
    if (!deleteBackupId) return
    setBackupError(null)
    try {
      await window.hymn.deleteBackup(deleteBackupId)
      setBackups((prev) => prev.filter((b) => b.id !== deleteBackupId))
      setBackupMessage(`Backup deleted.`)
    } catch (error) {
      setBackupError(error instanceof Error ? error.message : 'Failed to delete backup.')
    } finally {
      setDeleteBackupId(null)
    }
  }

  const handleExportModpack = async () => {
    if (!activeProfile) return
    setIsExporting(true)
    setImportExportMessage(null)
    setImportExportError(null)
    try {
      const result = await window.hymn.exportModpack({ profileId: activeProfile.id })
      setImportExportMessage(`Exported ${result.modCount} mods successfully.`)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to export modpack.'
      if (!message.includes('cancelled')) {
        setImportExportError(message)
      }
    } finally {
      setIsExporting(false)
    }
  }

  const handleImportModpack = async () => {
    setIsImporting(true)
    setImportExportMessage(null)
    setImportExportError(null)
    try {
      const result = await window.hymn.importModpack()
      setImportExportMessage(`Imported ${result.modCount} mods as new profile.`)
      await actions.loadProfiles()
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to import modpack.'
      if (!message.includes('cancelled')) {
        setImportExportError(message)
      }
    } finally {
      setIsImporting(false)
    }
  }

  const formatDate = (isoString: string) => {
    try {
      const date = new Date(isoString)
      return date.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    } catch {
      return isoString
    }
  }

  return (
    <div className="space-y-6">
      {/* Top Row */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Install Location Card */}
        <Card className="overflow-hidden">
          <CardHeader className="border-b border-border/50 bg-muted/30">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
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
                onClick={actions.handleSelectInstallPath}
                disabled={isScanning}
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

        {/* Import/Export Card */}
        <Card className="overflow-hidden">
          <CardHeader className="border-b border-border/50 bg-muted/30">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500/10">
                <Archive className="h-5 w-5 text-violet-400" />
              </div>
              <div>
                <CardTitle className="text-base">Import / Export</CardTitle>
                <CardDescription>Share modpacks with others</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-5 space-y-4">
            <p className="text-sm text-muted-foreground">
              Export your active profile to share with friends, or import a modpack file to create a new profile.
            </p>

            <div className="grid grid-cols-2 gap-3">
              <Button
                variant="outline"
                onClick={handleExportModpack}
                disabled={isExporting || isImporting || !activeProfile}
                className="h-11 flex-col gap-1"
              >
                <Download className="h-4 w-4" />
                <span className="text-xs">
                  {isExporting ? 'Exporting...' : 'Export'}
                </span>
              </Button>
              <Button
                variant="outline"
                onClick={handleImportModpack}
                disabled={isExporting || isImporting}
                className="h-11 flex-col gap-1"
              >
                <Upload className="h-4 w-4" />
                <span className="text-xs">
                  {isImporting ? 'Importing...' : 'Import'}
                </span>
              </Button>
            </div>

            {/* Status messages */}
            {importExportError && (
              <div className="flex items-center gap-2 rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive">
                <AlertTriangle className="h-3 w-3" />
                {importExportError}
              </div>
            )}
            {importExportMessage && (
              <div className="flex items-center gap-2 rounded-lg bg-success/10 px-3 py-2 text-xs text-success">
                <Check className="h-3 w-3" />
                {importExportMessage}
              </div>
            )}

            <p className="text-[10px] text-muted-foreground/70">
              Modpacks are saved as .hymnpack files containing profile settings and mod references.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Backups Card */}
      <Card className="overflow-hidden">
        <CardHeader className="border-b border-border/50 bg-muted/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10">
                <Clock className="h-5 w-5 text-amber-400" />
              </div>
              <div>
                <CardTitle className="text-base">Backups</CardTitle>
                <CardDescription>
                  {backups.length} backup{backups.length !== 1 ? 's' : ''} available
                </CardDescription>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={loadBackups}
              disabled={isLoadingBackups}
              className="h-8"
            >
              <RefreshCw className={cn('h-4 w-4', isLoadingBackups && 'animate-spin')} />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-5 space-y-4">
          {/* Status messages */}
          {backupError && (
            <div className="flex items-center gap-2 rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive">
              <AlertTriangle className="h-3 w-3" />
              {backupError}
            </div>
          )}
          {backupMessage && (
            <div className="flex items-center gap-2 rounded-lg bg-success/10 px-3 py-2 text-xs text-success">
              <Check className="h-3 w-3" />
              {backupMessage}
            </div>
          )}

          {backups.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-border/50 py-10">
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-muted/50">
                <Archive className="h-6 w-6 text-muted-foreground/50" />
              </div>
              <p className="text-sm font-medium">No backups yet</p>
              <p className="text-xs text-muted-foreground">
                Backups are created automatically when applying profiles.
              </p>
            </div>
          ) : (
            <ScrollArea className="max-h-64">
              <div className="space-y-2">
                {backups.map((backup) => (
                  <div
                    key={backup.id}
                    className="flex items-center justify-between rounded-xl border border-border/50 bg-card p-4 transition-colors hover:bg-muted/30"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-sm font-medium">{backup.profileId}</p>
                        <Badge variant="outline" className="text-[10px]">
                          {backup.modCount} mod{backup.modCount !== 1 ? 's' : ''}
                        </Badge>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {formatDate(backup.createdAt)}
                      </p>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setRestoreBackupId(backup.id)}
                        disabled={isRestoring || isScanning}
                        className="h-8 w-8 p-0"
                      >
                        <Archive className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setDeleteBackupId(backup.id)}
                        disabled={isRestoring || isScanning}
                        className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Restore Dialog */}
      <Dialog open={!!restoreBackupId} onOpenChange={() => setRestoreBackupId(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-warning/10">
                <Archive className="h-5 w-5 text-warning" />
              </div>
              <div>
                <DialogTitle>Restore Backup</DialogTitle>
                <DialogDescription>Revert to a previous state</DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground">
              This will restore your mod folders to the state from this backup. Your current configuration will be replaced.
            </p>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="ghost" onClick={() => setRestoreBackupId(null)}>
              Cancel
            </Button>
            <Button onClick={handleRestoreBackup} disabled={isRestoring} className="gap-2">
              <Archive className="h-4 w-4" />
              {isRestoring ? 'Restoring...' : 'Restore'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={!!deleteBackupId} onOpenChange={() => setDeleteBackupId(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-destructive/10">
                <Trash2 className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <DialogTitle>Delete Backup</DialogTitle>
                <DialogDescription>This action cannot be undone</DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground">
              Are you sure you want to permanently delete this backup?
            </p>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="ghost" onClick={() => setDeleteBackupId(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteBackup} className="gap-2">
              <Trash2 className="h-4 w-4" />
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
