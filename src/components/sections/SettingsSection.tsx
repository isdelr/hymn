import { useEffect, useState } from 'react'
import { Archive, Download, FolderOpen, Trash2, Upload } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { useAppContext } from '@/context/AppContext'
import type { BackupInfo } from '@/shared/hymn-types'
import { cn } from '@/lib/utils'

export function SettingsSection() {
  const { state, actions, activeProfile } = useAppContext()
  const { installInfo, isScanning, profilesState } = state

  const [backups, setBackups] = useState<BackupInfo[]>([])
  const [isLoadingBackups, setIsLoadingBackups] = useState(false)
  const [backupError, setBackupError] = useState<string | null>(null)
  const [backupMessage, setBackupMessage] = useState<string | null>(null)
  const [isRestoring, setIsRestoring] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [importExportMessage, setImportExportMessage] = useState<string | null>(null)
  const [importExportError, setImportExportError] = useState<string | null>(null)

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

  const handleRestoreBackup = async (backupId: string) => {
    setIsRestoring(true)
    setBackupMessage(null)
    setBackupError(null)
    try {
      const result = await window.hymn.restoreBackup(backupId)
      setBackupMessage(`Restored backup ${result.snapshotId}.`)
      await actions.runScan()
    } catch (error) {
      setBackupError(error instanceof Error ? error.message : 'Failed to restore backup.')
    } finally {
      setIsRestoring(false)
    }
  }

  const handleDeleteBackup = async (backupId: string) => {
    setBackupError(null)
    try {
      await window.hymn.deleteBackup(backupId)
      setBackups((prev) => prev.filter((b) => b.id !== backupId))
      setBackupMessage(`Deleted backup ${backupId}.`)
    } catch (error) {
      setBackupError(error instanceof Error ? error.message : 'Failed to delete backup.')
    }
  }

  const handleExportModpack = async () => {
    if (!activeProfile) return
    setIsExporting(true)
    setImportExportMessage(null)
    setImportExportError(null)
    try {
      const result = await window.hymn.exportModpack({ profileId: activeProfile.id })
      setImportExportMessage(`Exported ${result.modCount} mods to ${result.outputPath}.`)
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
      setImportExportMessage(`Imported ${result.modCount} mods as profile "${result.profileId}".`)
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
      return new Date(isoString).toLocaleString()
    } catch {
      return isoString
    }
  }

  return (
    <>
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold">Settings</h1>
        <p className="text-sm text-muted-foreground">Manage install paths, backups, and preferences.</p>
      </header>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Install paths</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={installInfo?.activePath ? 'secondary' : 'destructive'}>
                {installInfo?.activePath ? 'Detected' : 'Missing'}
              </Badge>
              <span className="text-muted-foreground">Active path</span>
            </div>
            <p className="font-mono text-xs text-muted-foreground">
              {installInfo?.activePath ?? 'No install detected. Choose a folder to continue.'}
            </p>
            <Separator />
            <div className="grid gap-2 text-xs text-muted-foreground">
              <p>Default path: {installInfo?.defaultPath ?? '—'}</p>
              <p>Packs path: {installInfo?.packsPath ?? 'Not found'}</p>
              <p>Mods path: {installInfo?.modsPath ?? 'Not found'}</p>
              <p>Early plugins: {installInfo?.earlyPluginsPath ?? 'Not found'}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" onClick={actions.handleSelectInstallPath} disabled={isScanning}>
                <FolderOpen className="mr-2 h-4 w-4" />
                Change Install Folder
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Import / Export</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p className="text-muted-foreground">
              Export your active profile to share with others, or import a modpack file.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="secondary"
                onClick={handleExportModpack}
                disabled={isExporting || isImporting || !activeProfile}
              >
                <Download className="mr-2 h-4 w-4" />
                {isExporting ? 'Exporting…' : 'Export Profile'}
              </Button>
              <Button
                variant="outline"
                onClick={handleImportModpack}
                disabled={isExporting || isImporting}
              >
                <Upload className="mr-2 h-4 w-4" />
                {isImporting ? 'Importing…' : 'Import Modpack'}
              </Button>
            </div>
            {importExportError && (
              <Badge variant="destructive">{importExportError}</Badge>
            )}
            {importExportMessage && (
              <Badge variant="secondary">{importExportMessage}</Badge>
            )}
            <p className="text-xs text-muted-foreground">
              Modpacks are exported as .hymnpack files containing profile configuration.
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center gap-3">
          <Archive className="h-5 w-5 text-muted-foreground" />
          <CardTitle className="text-base">Backup Management</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Backups are created automatically when applying profiles. You can restore or delete them here.
          </p>

          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" onClick={loadBackups} disabled={isLoadingBackups}>
              {isLoadingBackups ? 'Loading…' : 'Refresh'}
            </Button>
            {backupMessage && <Badge variant="secondary">{backupMessage}</Badge>}
            {backupError && <Badge variant="destructive">{backupError}</Badge>}
          </div>

          {backups.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              {isLoadingBackups ? 'Loading backups…' : 'No backups found.'}
            </p>
          ) : (
            <div className="space-y-2 max-h-64 overflow-auto">
              {backups.map((backup) => (
                <div
                  key={backup.id}
                  className={cn(
                    'flex items-center justify-between gap-3 rounded-lg border border-border/60 px-3 py-2 text-xs bg-muted/30',
                  )}
                >
                  <div className="flex flex-col min-w-0">
                    <span className="font-medium text-foreground truncate">{backup.id}</span>
                    <span className="text-muted-foreground">
                      {formatDate(backup.createdAt)} • {backup.modCount} mods • Profile: {backup.profileId}
                    </span>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button
                      size="icon-sm"
                      variant="outline"
                      onClick={() => handleRestoreBackup(backup.id)}
                      disabled={isRestoring || isScanning}
                      aria-label={`Restore backup ${backup.id}`}
                    >
                      <Archive className="h-3 w-3" />
                    </Button>
                    <Button
                      size="icon-sm"
                      variant="outline"
                      onClick={() => handleDeleteBackup(backup.id)}
                      disabled={isRestoring || isScanning}
                      aria-label={`Delete backup ${backup.id}`}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Preferences</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <div className="flex items-center justify-between">
            <span>Theme</span>
            <Badge variant="secondary">Dark</Badge>
          </div>
          <div className="flex items-center justify-between">
            <span>Active Profile</span>
            <Badge variant="outline">{activeProfile?.name ?? 'None'}</Badge>
          </div>
          <div className="flex items-center justify-between">
            <span>Total Profiles</span>
            <span className="text-xs">{profilesState?.profiles.length ?? 0}</span>
          </div>
          <div className="flex items-center justify-between">
            <span>Total Backups</span>
            <span className="text-xs">{backups.length}</span>
          </div>
        </CardContent>
      </Card>
    </>
  )
}
