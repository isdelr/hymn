import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { InstallInfo, ModEntry, Profile, ProfilesState, ScanResult } from '@/shared/hymn-types'

export interface AppState {
  installInfo: InstallInfo | null
  scanResult: ScanResult | null
  profilesState: ProfilesState | null
  isScanning: boolean
  errorMessage: string | null
  profileError: string | null
  isSwitchingProfile: boolean
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
  setErrorMessage: (message: string | null) => void
  setProfileError: (message: string | null) => void
}

export interface AppContextValue {
  state: AppState
  actions: AppActions
  activeProfile: Profile | null
  enabledModIds: Set<string>
  counts: { total: number; packs: number; plugins: number; early: number }
  warnings: string[]
  profileWarnings: string[]
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
  const [isSwitchingProfile, setIsSwitchingProfile] = useState(false)

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
    const entriesByKey = new Map<string, ModEntry>()

    entries.forEach((entry) => {
      entriesByKey.set(entry.id.toLowerCase(), entry)
      entriesByKey.set(entry.name.toLowerCase(), entry)
    })

    const warningsSet = new Set<string>()

    for (const entry of entries) {
      if (!enabledSet.has(entry.id)) continue
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
        }
      }
    }

    return Array.from(warningsSet).sort((a, b) => a.localeCompare(b))
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
    setIsSwitchingProfile(true)
    try {
      const state = await window.hymn.createProfile(name)
      setProfilesState(state)
      // Apply the new profile immediately (which has all mods off)
      if (state.activeProfileId) {
        await window.hymn.applyProfile(state.activeProfileId)
        await runScan()
      }
    } catch {
      setProfileError('Unable to create profile.')
    } finally {
      setIsSwitchingProfile(false)
    }
  }

  const handleActivateProfile = async (profileId: string) => {
    if (profileId === profilesState?.activeProfileId) return
    setProfileError(null)
    setIsSwitchingProfile(true)
    try {
      const state = await window.hymn.setActiveProfile(profileId)
      setProfilesState(state)
      // Apply the profile immediately
      await window.hymn.applyProfile(profileId)
      await runScan()
    } catch (error) {
      setProfileError(error instanceof Error ? error.message : 'Unable to switch profiles.')
    } finally {
      setIsSwitchingProfile(false)
    }
  }

  const handleUpdateProfile = async (profile: Profile): Promise<Profile | null> => {
    try {
      const updated = await window.hymn.updateProfile(profile)
      updateProfileState(updated)
      return updated
    } catch (error) {
      setProfileError(error instanceof Error ? error.message : 'Unable to update profile.')
      return null
    }
  }

  const handleToggleMod = async (entry: ModEntry, enabled: boolean) => {
    if (!activeProfile) return
    if (activeProfile.readonly) {
      setProfileError('Cannot modify the Default profile. Create a new profile first.')
      return
    }
    const nextEnabled = new Set(activeProfile.enabledMods)
    if (enabled) {
      nextEnabled.add(entry.id)
    } else {
      nextEnabled.delete(entry.id)
    }
    const updated = await handleUpdateProfile({
      ...activeProfile,
      enabledMods: Array.from(nextEnabled),
    })
    // Apply changes immediately after toggling
    if (updated) {
      setIsSwitchingProfile(true)
      try {
        await window.hymn.applyProfile(activeProfile.id)
        await runScan()
      } catch {
        // Ignore apply errors for toggle
      } finally {
        setIsSwitchingProfile(false)
      }
    }
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
    isSwitchingProfile,
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
    setErrorMessage,
    setProfileError,
  }

  const value: AppContextValue = {
    state,
    actions,
    activeProfile,
    enabledModIds,
    counts,
    warnings,
    profileWarnings,
  }

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}
