import { useEffect, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { Textarea } from '@/components/ui/textarea'
import { WarningBox } from '@/components/WarningBox'
import { useAppContext } from '@/context/AppContext'
import { cn } from '@/lib/utils'

export function ProfilesSection() {
  const { state, actions, activeProfile, profileWarnings, loadOrderEntries } = useAppContext()
  const { installInfo, scanResult, profilesState, profileError, applyMessage, applyError, applyWarnings, isApplying, isRollingBack, isScanning } = state

  const [profileName, setProfileName] = useState('')
  const [profileNotes, setProfileNotes] = useState('')

  useEffect(() => {
    setProfileNotes(activeProfile?.notes ?? '')
    actions.clearApplyMessages()
  }, [activeProfile?.id, activeProfile?.notes])

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
    await actions.handleCreateProfile(profileName)
    setProfileName('')
  }

  return (
    <>
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold">Profiles</h1>
        <p className="text-sm text-muted-foreground">
          Create, tune, and apply mod profiles with load order controls.
        </p>
      </header>
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
                    onClick={() => actions.handleActivateProfile(profile.id)}
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
                <WarningBox title="Profile warnings" warnings={profileWarnings} />
              ) : (
                <p className="text-xs text-muted-foreground">Scan the library to check profile conflicts.</p>
              )}
              {!scanResult && profileWarnings.length === 0 && (
                <p className="text-xs text-muted-foreground">No profile conflicts detected.</p>
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
                                {entry.missing ? 'Missing from scan' : `${entry.typeLabel} · ${entry.locationLabel}`}
                              </span>
                            </div>
                            <div className="flex flex-col gap-1">
                              <Button
                                size="icon-sm"
                                variant="outline"
                                onClick={() => actions.handleMoveLoadOrder(entry.id, 'up')}
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
                                onClick={() => actions.handleMoveLoadOrder(entry.id, 'down')}
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
                      onClick={actions.handleApplyProfile}
                      disabled={!installInfo?.activePath || isApplying || isRollingBack || isScanning}
                    >
                      {isApplying ? 'Applying…' : 'Apply Profile'}
                    </Button>
                    <Button
                      variant="secondary"
                      onClick={actions.handleRollback}
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
                  <WarningBox title="Apply warnings" warnings={applyWarnings} />
                </div>
              </div>
            </>
          ) : null}
        </CardContent>
      </Card>
    </>
  )
}
