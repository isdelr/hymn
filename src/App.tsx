import { useEffect, useMemo, useState } from 'react'
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
import { Textarea } from '@/components/ui/textarea'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import type { InstallInfo, ModEntry, Profile, ProfilesState, ScanResult } from '@/shared/hymn-types'
import { cn } from '@/lib/utils'

const typeLabels: Record<ModEntry['type'], string> = {
  pack: 'Pack',
  plugin: 'Plugin',
  'early-plugin': 'Early Plugin',
  unknown: 'Unknown',
}

const formatLabels: Record<ModEntry['format'], string> = {
  directory: 'Folder',
  jar: 'Jar',
  zip: 'Zip',
}

const locationLabels: Record<ModEntry['location'], string> = {
  mods: 'Mods',
  packs: 'Packs',
  earlyplugins: 'Early Plugins',
}

function App() {
  const [installInfo, setInstallInfo] = useState<InstallInfo | null>(null)
  const [scanResult, setScanResult] = useState<ScanResult | null>(null)
  const [filter, setFilter] = useState('')
  const [isScanning, setIsScanning] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [profilesState, setProfilesState] = useState<ProfilesState | null>(null)
  const [profileName, setProfileName] = useState('')
  const [profileNotes, setProfileNotes] = useState('')
  const [profileError, setProfileError] = useState<string | null>(null)
  const [applyMessage, setApplyMessage] = useState<string | null>(null)
  const [applyError, setApplyError] = useState<string | null>(null)
  const [applyWarnings, setApplyWarnings] = useState<string[]>([])
  const [isApplying, setIsApplying] = useState(false)
  const [isRollingBack, setIsRollingBack] = useState(false)

  const counts = useMemo(() => {
    const entries = scanResult?.entries ?? []
    return {
      total: entries.length,
      packs: entries.filter((entry) => entry.type === 'pack').length,
      plugins: entries.filter((entry) => entry.type === 'plugin').length,
      early: entries.filter((entry) => entry.type === 'early-plugin').length,
    }
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

  const warnings = useMemo(() => {
    const allWarnings = scanResult?.warnings ?? []
    if (installInfo?.issues?.length) {
      return Array.from(new Set([...installInfo.issues, ...allWarnings]))
    }
    return allWarnings
  }, [installInfo, scanResult])

  const activeProfile = useMemo(() => {
    if (!profilesState) return null
    return profilesState.profiles.find((profile) => profile.id === profilesState.activeProfileId) ?? null
  }, [profilesState])

  const enabledModIds = useMemo(() => {
    return new Set(activeProfile?.enabledMods ?? [])
  }, [activeProfile])

  const profileWarnings = useMemo(() => {
    if (!activeProfile || !scanResult) {
      return []
    }

    const entries = scanResult.entries
    const enabledSet = new Set(activeProfile.enabledMods)
    const loadIndex = new Map(activeProfile.loadOrder.map((id, index) => [id, index]))
    const entriesByKey = new Map<string, ModEntry>()

    entries.forEach((entry) => {
      entriesByKey.set(entry.id.toLowerCase(), entry)
      entriesByKey.set(entry.name.toLowerCase(), entry)
    })

    const warnings = new Set<string>()

    for (const entry of entries) {
      if (!enabledSet.has(entry.id)) continue
      if (!loadIndex.has(entry.id)) {
        warnings.add(`${entry.name}: enabled but missing from the load order.`)
      }
      for (const dependency of entry.dependencies) {
        const dependencyLabel = dependency.trim()
        if (!dependencyLabel) continue
        const depEntry = entriesByKey.get(dependencyLabel.toLowerCase())
        if (!depEntry) {
          warnings.add(`${entry.name}: missing dependency ${dependencyLabel}.`)
          continue
        }
        if (!enabledSet.has(depEntry.id)) {
          warnings.add(`${entry.name}: dependency ${depEntry.name} is disabled.`)
          continue
        }
        const depIndex = loadIndex.get(depEntry.id)
        const entryIndex = loadIndex.get(entry.id)
        if (depIndex !== undefined && entryIndex !== undefined && depIndex > entryIndex) {
          warnings.add(`${entry.name}: ${depEntry.name} should load before this mod.`)
        }
      }
    }

    return Array.from(warnings).sort((a, b) => a.localeCompare(b))
  }, [activeProfile, scanResult])

  const loadOrderEntries = useMemo(() => {
    if (!activeProfile) {
      return []
    }

    const entriesById = new Map((scanResult?.entries ?? []).map((entry) => [entry.id, entry]))

    return activeProfile.loadOrder.map((id) => {
      const entry = entriesById.get(id)
      return {
        id,
        name: entry?.name ?? id,
        typeLabel: entry ? typeLabels[entry.type] : 'Unknown',
        locationLabel: entry ? locationLabels[entry.location] : 'Not found',
        missing: !entry,
      }
    })
  }, [activeProfile, scanResult])

  useEffect(() => {
    void loadInstallInfo()
    void loadProfiles()
  }, [])

  useEffect(() => {
    setProfileNotes(activeProfile?.notes ?? '')
    setApplyMessage(null)
    setApplyError(null)
    setApplyWarnings([])
  }, [activeProfile?.id])

  const loadInstallInfo = async () => {
    try {
      const info = await window.hymn.getInstallInfo()
      setInstallInfo(info)
      if (info.activePath) {
        await runScan()
      }
    } catch (error) {
      setErrorMessage('Unable to read Hytale install info.')
    }
  }

  const loadProfiles = async () => {
    try {
      const state = await window.hymn.getProfiles()
      setProfilesState(state)
      setProfileError(null)
    } catch (error) {
      setProfileError('Unable to load profiles.')
    }
  }

  const updateProfileState = (updatedProfile: Profile) => {
    setProfilesState((prev) => {
      if (!prev) return prev
      return {
        ...prev,
        profiles: prev.profiles.map((profile) =>
          profile.id === updatedProfile.id ? updatedProfile : profile,
        ),
      }
    })
  }

  const runScan = async () => {
    setIsScanning(true)
    setErrorMessage(null)
    try {
      const result = await window.hymn.scanMods()
      setScanResult(result)
      await loadProfiles()
    } catch (error) {
      setErrorMessage('Mod scan failed. Check file access permissions.')
    } finally {
      setIsScanning(false)
    }
  }

  const handleSelectInstallPath = async () => {
    setErrorMessage(null)
    try {
      const info = await window.hymn.selectInstallPath()
      setInstallInfo(info)
      if (info.activePath) {
        await runScan()
      }
    } catch (error) {
      setErrorMessage('Unable to select install folder.')
    }
  }

  const handleCreateProfile = async () => {
    setProfileError(null)
    try {
      const state = await window.hymn.createProfile(profileName)
      setProfilesState(state)
      setProfileName('')
    } catch (error) {
      setProfileError('Unable to create profile.')
    }
  }

  const handleActivateProfile = async (profileId: string) => {
    setProfileError(null)
    try {
      const state = await window.hymn.setActiveProfile(profileId)
      setProfilesState(state)
    } catch (error) {
      setProfileError('Unable to switch profiles.')
    }
  }

  const handleProfileNotesBlur = async () => {
    if (!activeProfile) return
    const nextNotes = profileNotes.trim()
    const currentNotes = activeProfile.notes ?? ''
    if (nextNotes === currentNotes) return
    try {
      const updated = await window.hymn.updateProfile({
        ...activeProfile,
        notes: nextNotes.length ? nextNotes : undefined,
      })
      updateProfileState(updated)
    } catch (error) {
      setProfileError('Unable to save profile notes.')
    }
  }

  const handleToggleMod = async (entry: ModEntry, enabled: boolean) => {
    if (!activeProfile) return
    const nextEnabled = new Set(activeProfile.enabledMods)
    if (enabled) {
      nextEnabled.add(entry.id)
    } else {
      nextEnabled.delete(entry.id)
    }
    const nextLoadOrder = activeProfile.loadOrder.filter((id) => id !== entry.id)
    if (enabled) {
      nextLoadOrder.push(entry.id)
    }
    try {
      const updated = await window.hymn.updateProfile({
        ...activeProfile,
        enabledMods: Array.from(nextEnabled),
        loadOrder: nextLoadOrder,
      })
      updateProfileState(updated)
    } catch (error) {
      setProfileError('Unable to update profile mods.')
    }
  }

  const handleMoveLoadOrder = async (modId: string, direction: 'up' | 'down') => {
    if (!activeProfile) return
    const currentIndex = activeProfile.loadOrder.indexOf(modId)
    if (currentIndex < 0) return
    const nextIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1
    if (nextIndex < 0 || nextIndex >= activeProfile.loadOrder.length) return

    const nextOrder = [...activeProfile.loadOrder]
    nextOrder.splice(currentIndex, 1)
    nextOrder.splice(nextIndex, 0, modId)

    try {
      const updated = await window.hymn.updateProfile({
        ...activeProfile,
        loadOrder: nextOrder,
      })
      updateProfileState(updated)
    } catch (error) {
      setProfileError('Unable to update load order.')
    }
  }

  const handleApplyProfile = async () => {
    if (!activeProfile) return
    setApplyError(null)
    setApplyMessage(null)
    setApplyWarnings([])
    setIsApplying(true)
    try {
      const result = await window.hymn.applyProfile(activeProfile.id)
      setApplyMessage(`Applied ${activeProfile.name}. Snapshot ${result.snapshotId}.`)
      setApplyWarnings(result.warnings)
      await runScan()
    } catch (error) {
      setApplyError(error instanceof Error ? error.message : 'Unable to apply profile.')
    } finally {
      setIsApplying(false)
    }
  }

  const handleRollback = async () => {
    setApplyError(null)
    setApplyMessage(null)
    setApplyWarnings([])
    setIsRollingBack(true)
    try {
      const result = await window.hymn.rollbackLastApply()
      setApplyMessage(`Rolled back to snapshot ${result.snapshotId}.`)
      setApplyWarnings(result.warnings)
      await runScan()
    } catch (error) {
      setApplyError(error instanceof Error ? error.message : 'Unable to rollback.')
    } finally {
      setIsRollingBack(false)
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-6 py-8">
        <header className="flex flex-col gap-2">
          <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Hymn</p>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-semibold">Hytale Mod Manager</h1>
              <p className="text-sm text-muted-foreground">
                Scan your install, inspect mod metadata, and prepare profiles.
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="secondary" onClick={handleSelectInstallPath}>
                Choose Folder
              </Button>
              <Button onClick={runScan} disabled={isScanning || !installInfo?.activePath}>
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
            <CardTitle className="text-base">Profiles</CardTitle>
            {profileError ? <Badge variant="destructive">{profileError}</Badge> : null}
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {profilesState ? (
                profilesState.profiles.length ? (
                  profilesState.profiles.map((profile) => (
                    <Button
                      key={profile.id}
                      variant={profile.id === profilesState.activeProfileId ? 'default' : 'secondary'}
                      size="sm"
                      onClick={() => handleActivateProfile(profile.id)}
                    >
                      {profile.name}
                    </Button>
                  ))
                ) : (
                  <p className="text-xs text-muted-foreground">No profiles available.</p>
                )
              ) : (
                <p className="text-xs text-muted-foreground">Loading profiles…</p>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              <Input
                value={profileName}
                onChange={(event) => setProfileName(event.target.value)}
                placeholder="New profile name"
                className="min-w-[220px]"
              />
              <Button variant="secondary" onClick={handleCreateProfile}>
                Add Profile
              </Button>
            </div>
            {activeProfile ? (
              <>
                <div className="grid gap-3 md:grid-cols-[1fr_1.2fr]">
                  <div className="rounded-lg bg-muted/40 p-3 text-xs text-muted-foreground">
                    <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground/70">
                      Active Profile
                    </p>
                    <p className="mt-2 text-sm font-semibold text-foreground">{activeProfile.name}</p>
                    <div className="mt-3 space-y-1">
                      <p>Enabled mods: {activeProfile.enabledMods.length}</p>
                      <p>Load order items: {activeProfile.loadOrder.length}</p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground">Profile notes</p>
                    <Textarea
                      value={profileNotes}
                      onChange={(event) => setProfileNotes(event.target.value)}
                      onBlur={handleProfileNotesBlur}
                      placeholder="Describe how this profile is used"
                    />
                  </div>
                </div>
                {scanResult ? (
                  profileWarnings.length ? (
                    <div className="rounded-lg border border-dashed border-border/60 bg-muted/30 p-3 text-xs">
                      <p className="font-medium text-muted-foreground">Profile warnings</p>
                      <ul className="mt-2 space-y-1 text-muted-foreground">
                        {profileWarnings.map((warning) => (
                          <li key={warning} className="leading-relaxed">
                            {warning}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">No profile conflicts detected.</p>
                  )
                ) : (
                  <p className="text-xs text-muted-foreground">Scan the library to check profile conflicts.</p>
                )}
                <Separator />
                <div className="grid gap-4 md:grid-cols-[1.2fr_1fr]">
                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground">Load order</p>
                    {scanResult ? (
                      loadOrderEntries.length ? (
                        <div className="max-h-60 space-y-2 overflow-auto pr-1">
                          {loadOrderEntries.map((entry, index) => (
                            <div
                              key={entry.id}
                              className={cn(
                                'flex items-center justify-between gap-3 rounded-lg border border-border/60 px-3 py-2 text-xs',
                                entry.missing ? 'bg-destructive/10' : 'bg-muted/30',
                              )}
                            >
                              <div className="flex flex-col">
                                <span className="text-sm font-medium text-foreground">{entry.name}</span>
                                <span className="text-[11px] text-muted-foreground">{entry.id}</span>
                                <span
                                  className={cn(
                                    'text-[11px]',
                                    entry.missing ? 'text-destructive' : 'text-muted-foreground',
                                  )}
                                >
                                  {entry.missing
                                    ? 'Missing from scan'
                                    : `${entry.typeLabel} · ${entry.locationLabel}`}
                                </span>
                              </div>
                              <div className="flex flex-col gap-1">
                                <Button
                                  size="icon-sm"
                                  variant="outline"
                                  onClick={() => handleMoveLoadOrder(entry.id, 'up')}
                                  disabled={
                                    isApplying ||
                                    isRollingBack ||
                                    isScanning ||
                                    index === 0 ||
                                    loadOrderEntries.length <= 1
                                  }
                                  aria-label={`Move ${entry.name} up`}
                                >
                                  ↑
                                </Button>
                                <Button
                                  size="icon-sm"
                                  variant="outline"
                                  onClick={() => handleMoveLoadOrder(entry.id, 'down')}
                                  disabled={
                                    isApplying ||
                                    isRollingBack ||
                                    isScanning ||
                                    index === loadOrderEntries.length - 1 ||
                                    loadOrderEntries.length <= 1
                                  }
                                  aria-label={`Move ${entry.name} down`}
                                >
                                  ↓
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground">No mods in the load order yet.</p>
                      )
                    ) : (
                      <p className="text-xs text-muted-foreground">Scan the library to edit load order.</p>
                    )}
                  </div>
                  <div className="space-y-3">
                    <p className="text-xs text-muted-foreground">Apply &amp; rollback</p>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        onClick={handleApplyProfile}
                        disabled={!installInfo?.activePath || isApplying || isRollingBack || isScanning}
                      >
                        {isApplying ? 'Applying…' : 'Apply Profile'}
                      </Button>
                      <Button
                        variant="secondary"
                        onClick={handleRollback}
                        disabled={isApplying || isRollingBack || isScanning}
                      >
                        {isRollingBack ? 'Rolling back…' : 'Rollback'}
                      </Button>
                    </div>
                    {applyError ? (
                      <Badge variant="destructive">{applyError}</Badge>
                    ) : applyMessage ? (
                      <Badge variant="secondary">{applyMessage}</Badge>
                    ) : (
                      <p className="text-xs text-muted-foreground">
                        Apply changes to sync folders and create a backup snapshot.
                      </p>
                    )}
                    {applyWarnings.length ? (
                      <div className="rounded-lg border border-dashed border-border/60 bg-muted/30 p-3 text-xs">
                        <p className="font-medium text-muted-foreground">Apply warnings</p>
                        <ul className="mt-2 space-y-1 text-muted-foreground">
                          {applyWarnings.map((warning) => (
                            <li key={warning} className="leading-relaxed">
                              {warning}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                  </div>
                </div>
              </>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-4">
            <CardTitle className="text-base">Detected Mods</CardTitle>
            {errorMessage ? <Badge variant="destructive">{errorMessage}</Badge> : null}
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
                    <TableHead>Warnings</TableHead>
                    <TableHead>Enabled</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visibleEntries.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="py-8 text-center text-sm text-muted-foreground">
                        {installInfo?.activePath
                          ? 'No mods found in the selected folders.'
                          : 'Select a Hytale install folder to begin.'}
                      </TableCell>
                    </TableRow>
                  ) : (
                    visibleEntries.map((entry) => {
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
                          <TableCell className="text-xs text-muted-foreground">
                            {entry.version ?? '—'}
                          </TableCell>
                          <TableCell className="whitespace-normal">
                            {entry.warnings.length ? (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Badge variant="destructive" className="cursor-help">
                                    {entry.warnings.length}{' '}
                                    {entry.warnings.length === 1 ? 'warning' : 'warnings'}
                                  </Badge>
                                </TooltipTrigger>
                                <TooltipContent side="right" className="max-w-xs">
                                  <ul className="space-y-1">
                                    {entry.warnings.map((warning, index) => (
                                      <li
                                        key={`${entry.id}-warning-${index}`}
                                        className="leading-snug"
                                      >
                                        {warning}
                                      </li>
                                    ))}
                                  </ul>
                                </TooltipContent>
                              </Tooltip>
                            ) : (
                              <span className="text-xs text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Switch
                              checked={isEnabled}
                              disabled={!activeProfile}
                              onCheckedChange={(checked) => handleToggleMod(entry, checked)}
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

            {warnings.length ? (
              <div className="mt-4 rounded-lg border border-dashed border-border/60 bg-muted/30 p-3 text-xs">
                <p className="font-medium text-muted-foreground">Scan warnings</p>
                <ul className="mt-2 space-y-1 text-muted-foreground">
                  {warnings.map((warning) => (
                    <li key={warning} className={cn('leading-relaxed')}>{warning}</li>
                  ))}
                </ul>
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default App
