import { useMemo, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { typeLabels, formatLabels, locationLabels } from '@/shared/labels'
import type { ModEntry } from '@/shared/hymn-types'

// React Query hooks
import { useInstallInfo, useMods, useWorlds, useProfiles } from '@/hooks/queries'
import { useSelectInstallPath, useToggleMod } from '@/hooks/mutations'

export function LibrarySection() {
  // React Query data
  const { data: installInfo } = useInstallInfo()
  const { data: worldsState } = useWorlds(!!installInfo?.activePath)
  const selectedWorldId = worldsState?.selectedWorldId ?? null
  const { data: scanResult, isLoading: isScanning, refetch: runScan } = useMods(selectedWorldId)
  const { data: profilesState } = useProfiles()

  // Mutations
  const selectInstallPath = useSelectInstallPath()
  const toggleMod = useToggleMod()

  const [filter, setFilter] = useState('')

  // Derived data
  const activeProfile = profilesState?.profiles.find(p => p.id === profilesState.activeProfileId)
  const enabledModIds = useMemo(() => {
    const entries = scanResult?.entries ?? []
    return new Set(entries.filter(e => e.enabled).map(e => e.id))
  }, [scanResult])

  const counts = useMemo(() => {
    const entries = scanResult?.entries ?? []
    return {
      total: entries.length,
      packs: entries.filter(e => e.type === 'pack').length,
      plugins: entries.filter(e => e.type === 'plugin').length,
      early: entries.filter(e => e.type === 'early-plugin').length,
    }
  }, [scanResult])

  const visibleEntries = useMemo(() => {
    const entries = scanResult?.entries ?? []
    if (!filter.trim()) return entries
    const lowered = filter.toLowerCase()
    return entries.filter((entry: ModEntry) => {
      return [entry.name, entry.group, entry.id]
        .filter(Boolean)
        .some((value) => value?.toLowerCase().includes(lowered))
    })
  }, [filter, scanResult])

  const selectedWorld = worldsState?.worlds.find(w => w.id === selectedWorldId)

  return (
    <>
      <header className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold">Hytale Mod Manager</h1>
            <p className="text-sm text-muted-foreground">
              Scan your install, inspect mod metadata, and prepare profiles.
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => selectInstallPath.mutate()}>
              Choose Folder
            </Button>
            <Button onClick={() => runScan()} disabled={isScanning || !installInfo?.activePath}>
              {isScanning ? 'Scanning…' : 'Rescan'}
            </Button>
          </div>
        </div>
      </header>

      <div className="grid gap-4 md:grid-cols-[1.2fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Install Status</CardTitle>
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
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Library Snapshot</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-lg bg-muted/50 p-3">
                <p className="text-xs text-muted-foreground">Total mods</p>
                <p className="text-xl font-semibold">{counts.total}</p>
              </div>
              <div className="rounded-lg bg-muted/50 p-3">
                <p className="text-xs text-muted-foreground">Packs</p>
                <p className="text-xl font-semibold">{counts.packs}</p>
              </div>
              <div className="rounded-lg bg-muted/50 p-3">
                <p className="text-xs text-muted-foreground">Plugins</p>
                <p className="text-xl font-semibold">{counts.plugins}</p>
              </div>
              <div className="rounded-lg bg-muted/50 p-3">
                <p className="text-xs text-muted-foreground">Early plugins</p>
                <p className="text-xl font-semibold">{counts.early}</p>
              </div>
            </div>
            <Input
              value={filter}
              onChange={(event) => setFilter(event.target.value)}
              placeholder="Filter by name, group, or id"
            />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <CardTitle className="text-base">Detected Mods</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-hidden rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Format</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Version</TableHead>
                  <TableHead>Enabled</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visibleEntries.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-8 text-center text-sm text-muted-foreground">
                      {installInfo?.activePath
                        ? 'No mods found in the selected folders.'
                        : 'Select a Hytale install folder to begin.'}
                    </TableCell>
                  </TableRow>
                ) : (
                  visibleEntries.map((entry: ModEntry) => {
                    const isEnabled = activeProfile ? enabledModIds.has(entry.id) : entry.enabled
                    return (
                      <TableRow key={`${entry.location}-${entry.path}`}>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-medium">{entry.name}</span>
                            <span className="text-xs text-muted-foreground">{entry.id}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">{typeLabels[entry.type]}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{formatLabels[entry.format]}</Badge>
                        </TableCell>
                        <TableCell>
                          <span className="text-xs text-muted-foreground">
                            {locationLabels[entry.location]}
                          </span>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">{entry.version ?? '—'}</TableCell>
                        <TableCell>
                          <Switch
                            checked={isEnabled}
                            disabled={!selectedWorld}
                            onCheckedChange={(checked) =>
                              selectedWorld && toggleMod.mutate({ worldId: selectedWorld.id, entry, enabled: checked })
                            }
                            aria-label={`Toggle ${entry.name}`}
                          />
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </>
  )
}
