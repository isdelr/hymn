import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { InstallInfo, ModEntry, Profile, ProfilesState, ScanResult } from '@/shared/hymn-types'
import { typeLabels, locationLabels } from '@/shared/labels'

export interface AppState {
  installInfo: InstallInfo | null
  scanResult: ScanResult | null
  profilesState: ProfilesState | null
  isScanning: boolean
  errorMessage: string | null
  profileError: string | null
  applyMessage: string | null
  applyError: string | null
  applyWarnings: string[]
  isApplying: boolean
  isRollingBack: boolean
}

export interface AppActions {
  loadInstallInfo: () => Promise<void>
  loadProfiles: () => Promise<void>
  runScan: () => Promise<void>
  handleSelectInstallPath: () => Promise<void>
  handleCreateProfile: (name: string) => Promise<void>
  handleActivateProfile: (profileId: string) => Promise<void>
  handleUpdateProfile: (profile: Profile) => Promise<Profile | null>
  handleToggleMod: (entry: ModEntry, enabled: boolean) => Promise<void>
  handleMoveLoadOrder: (modId: string, direction: 'up' | 'down') => Promise<void>
  handleApplyProfile: () => Promise<void>
  handleRollback: () => Promise<void>
  setErrorMessage: (message: string | null) => void
  setProfileError: (message: string | null) => void
  clearApplyMessages: () => void
}

export interface AppContextValue {
  state: AppState
  actions: AppActions
  activeProfile: Profile | null
  enabledModIds: Set<string>
  counts: { total: number; packs: number; plugins: number; early: number }
  warnings: string[]
  profileWarnings: string[]
  loadOrderEntries: Array<{
    id: string
    name: string
    typeLabel: string
    locationLabel: string
    missing: boolean
  }>
}

const AppContext = createContext<AppContextValue | null>(null)

export function useAppContext() {
  const context = useContext(AppContext)
  if (!context) {
    throw new Error('useAppContext must be used within AppProvider')
  }
  return context
}


export function AppProvider({ children }: { children: ReactNode }) {
  const [installInfo, setInstallInfo] = useState<InstallInfo | null>(null)
  const [scanResult, setScanResult] = useState<ScanResult | null>(null)
  const [isScanning, setIsScanning] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [profilesState, setProfilesState] = useState<ProfilesState | null>(null)
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

    const warningsSet = new Set<string>()

    for (const entry of entries) {
      if (!enabledSet.has(entry.id)) continue
      if (!loadIndex.has(entry.id)) {
        warningsSet.add(`${entry.name}: enabled but missing from the load order.`)
      }
      for (const dependency of entry.dependencies) {
        const dependencyLabel = dependency.trim()
        if (!dependencyLabel) continue
        const depEntry = entriesByKey.get(dependencyLabel.toLowerCase())
        if (!depEntry) {
          warningsSet.add(`${entry.name}: missing dependency ${dependencyLabel}.`)
          continue
        }
        if (!enabledSet.has(depEntry.id)) {
          warningsSet.add(`${entry.name}: dependency ${depEntry.name} is disabled.`)
          continue
        }
        const depIndex = loadIndex.get(depEntry.id)
        const entryIndex = loadIndex.get(entry.id)
        if (depIndex !== undefined && entryIndex !== undefined && depIndex > entryIndex) {
          warningsSet.add(`${entry.name}: ${depEntry.name} should load before this mod.`)
        }
      }
    }

    return Array.from(warningsSet).sort((a, b) => a.localeCompare(b))
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

  const loadInstallInfo = async () => {
    try {
      const info = await window.hymn.getInstallInfo()
      setInstallInfo(info)
      if (info.activePath) {
        await runScan()
      }
    } catch {
      setErrorMessage('Unable to read Hytale install info.')
    }
  }

  const loadProfiles = async () => {
    try {
      const state = await window.hymn.getProfiles()
      setProfilesState(state)
      setProfileError(null)
    } catch {
      setProfileError('Unable to load profiles.')
    }
  }

  const runScan = async () => {
    setIsScanning(true)
    setErrorMessage(null)
    try {
      const result = await window.hymn.scanMods()
      setScanResult(result)
      await loadProfiles()
    } catch {
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
    } catch {
      setErrorMessage('Unable to select install folder.')
    }
  }

  const handleCreateProfile = async (name: string) => {
    setProfileError(null)
    try {
      const state = await window.hymn.createProfile(name)
      setProfilesState(state)
    } catch {
      setProfileError('Unable to create profile.')
    }
  }

  const handleActivateProfile = async (profileId: string) => {
    setProfileError(null)
    try {
      const state = await window.hymn.setActiveProfile(profileId)
      setProfilesState(state)
    } catch {
      setProfileError('Unable to switch profiles.')
    }
  }

  const handleUpdateProfile = async (profile: Profile): Promise<Profile | null> => {
    try {
      const updated = await window.hymn.updateProfile(profile)
      updateProfileState(updated)
      return updated
    } catch {
      setProfileError('Unable to update profile.')
      return null
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
    await handleUpdateProfile({
      ...activeProfile,
      enabledMods: Array.from(nextEnabled),
      loadOrder: nextLoadOrder,
    })
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

    await handleUpdateProfile({
      ...activeProfile,
      loadOrder: nextOrder,
    })
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

  const clearApplyMessages = () => {
    setApplyMessage(null)
    setApplyError(null)
    setApplyWarnings([])
  }

  useEffect(() => {
    void loadInstallInfo()
    void loadProfiles()
  }, [])

  const state: AppState = {
    installInfo,
    scanResult,
    profilesState,
    isScanning,
    errorMessage,
    profileError,
    applyMessage,
    applyError,
    applyWarnings,
    isApplying,
    isRollingBack,
  }

  const actions: AppActions = {
    loadInstallInfo,
    loadProfiles,
    runScan,
    handleSelectInstallPath,
    handleCreateProfile,
    handleActivateProfile,
    handleUpdateProfile,
    handleToggleMod,
    handleMoveLoadOrder,
    handleApplyProfile,
    handleRollback,
    setErrorMessage,
    setProfileError,
    clearApplyMessages,
  }

  const value: AppContextValue = {
    state,
    actions,
    activeProfile,
    enabledModIds,
    counts,
    warnings,
    profileWarnings,
    loadOrderEntries,
  }

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}
