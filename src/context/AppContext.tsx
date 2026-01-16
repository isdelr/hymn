import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type {
  InstallInfo,
  ModEntry,
  Profile,
  ProfilesState,
  ScanResult,
  WorldInfo,
  WorldsState,
} from '@/shared/hymn-types'

export interface AppState {
  installInfo: InstallInfo | null
  scanResult: ScanResult | null
  worldsState: WorldsState | null
  isScanning: boolean
  errorMessage: string | null
  worldError: string | null
  isTogglingMod: boolean
  // Legacy profile state (kept for backwards compatibility)
  profilesState: ProfilesState | null
  profileError: string | null
  isSwitchingProfile: boolean
}

export interface AppActions {
  loadInstallInfo: () => Promise<void>
  loadWorlds: () => Promise<void>
  runScan: () => Promise<void>
  handleSelectInstallPath: () => Promise<void>
  handleSelectWorld: (worldId: string) => Promise<void>
  handleToggleMod: (entry: ModEntry, enabled: boolean) => Promise<void>
  handleDeleteMod: (entry: ModEntry) => Promise<boolean>
  handleAddMods: () => Promise<boolean>
  setErrorMessage: (message: string | null) => void
  setWorldError: (message: string | null) => void
  // Legacy profile actions (kept for backwards compatibility)
  loadProfiles: () => Promise<void>
  handleCreateProfile: (name: string) => Promise<void>
  handleActivateProfile: (profileId: string) => Promise<void>
  handleUpdateProfile: (profile: Profile) => Promise<Profile | null>
  setProfileError: (message: string | null) => void
}

export interface AppContextValue {
  state: AppState
  actions: AppActions
  selectedWorld: WorldInfo | null
  enabledModIds: Set<string>
  counts: { total: number; packs: number; plugins: number; early: number }
  // Legacy profile values (kept for backwards compatibility)
  activeProfile: Profile | null
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
  const [worldsState, setWorldsState] = useState<WorldsState | null>(null)
  const [isScanning, setIsScanning] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [worldError, setWorldError] = useState<string | null>(null)
  const [isTogglingMod, setIsTogglingMod] = useState(false)
  // Legacy profile state
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

  const selectedWorld = useMemo(() => {
    if (!worldsState || !worldsState.selectedWorldId) return null
    return worldsState.worlds.find((world) => world.id === worldsState.selectedWorldId) ?? null
  }, [worldsState])

  const enabledModIds = useMemo(() => {
    // Derive enabled mods from scan result (which reads from world config)
    const entries = scanResult?.entries ?? []
    return new Set(entries.filter((entry) => entry.enabled).map((entry) => entry.id))
  }, [scanResult])

  // Legacy profile values
  const activeProfile = useMemo(() => {
    if (!profilesState) return null
    return profilesState.profiles.find((profile) => profile.id === profilesState.activeProfileId) ?? null
  }, [profilesState])

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
        await loadWorlds()
        await runScan()
      }
    } catch {
      setErrorMessage('Unable to read Hytale install info.')
    }
  }

  const loadWorlds = async () => {
    try {
      const state = await window.hymn.getWorlds()
      setWorldsState(state)
      setWorldError(null)
    } catch {
      setWorldError('Unable to load worlds.')
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
      // Scan with the selected world to get correct enabled state
      const worldId = worldsState?.selectedWorldId ?? undefined
      const result = await window.hymn.scanMods(worldId)
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
        await loadWorlds()
        await runScan()
      }
    } catch {
      setErrorMessage('Unable to select install folder.')
    }
  }

  const handleSelectWorld = async (worldId: string) => {
    if (worldId === worldsState?.selectedWorldId) return
    setWorldError(null)
    setIsTogglingMod(true)
    try {
      await window.hymn.setSelectedWorld(worldId)
      setWorldsState((prev) => (prev ? { ...prev, selectedWorldId: worldId } : prev))
      // Rescan with the new world to get correct enabled state
      const result = await window.hymn.scanMods(worldId)
      setScanResult(result)
    } catch (error) {
      setWorldError(error instanceof Error ? error.message : 'Unable to switch worlds.')
    } finally {
      setIsTogglingMod(false)
    }
  }

  const handleToggleMod = async (entry: ModEntry, enabled: boolean) => {
    if (!selectedWorld) {
      setWorldError('Please select a world first.')
      return
    }
    setWorldError(null)
    setIsTogglingMod(true)
    try {
      await window.hymn.setModEnabled({
        worldId: selectedWorld.id,
        modId: entry.id,
        enabled,
      })
      // Rescan to get updated state
      const result = await window.hymn.scanMods(selectedWorld.id)
      setScanResult(result)
    } catch (error) {
      setWorldError(error instanceof Error ? error.message : 'Unable to toggle mod.')
    } finally {
      setIsTogglingMod(false)
    }
  }

  const handleDeleteMod = async (entry: ModEntry): Promise<boolean> => {
    setErrorMessage(null)
    setIsTogglingMod(true)
    try {
      const result = await window.hymn.deleteMod({
        modId: entry.id,
        modPath: entry.path,
      })
      if (result.success) {
        // Rescan after deletion
        const worldId = worldsState?.selectedWorldId ?? undefined
        const scanRes = await window.hymn.scanMods(worldId)
        setScanResult(scanRes)
        return true
      }
      return false
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to delete mod.')
      return false
    } finally {
      setIsTogglingMod(false)
    }
  }

  const handleAddMods = async (): Promise<boolean> => {
    setErrorMessage(null)
    setIsTogglingMod(true)
    try {
      const result = await window.hymn.addMods()
      if (result.success) {
        // Rescan after adding
        const worldId = worldsState?.selectedWorldId ?? undefined
        const scanRes = await window.hymn.scanMods(worldId)
        setScanResult(scanRes)
        return true
      }
      return false
    } catch (error) {
      // Don't show error if user cancelled
      if (error instanceof Error && error.message.includes('cancelled')) {
        return false
      }
      setErrorMessage(error instanceof Error ? error.message : 'Unable to add mods.')
      return false
    } finally {
      setIsTogglingMod(false)
    }
  }

  // Legacy profile handlers
  const handleCreateProfile = async (name: string) => {
    setProfileError(null)
    setIsSwitchingProfile(true)
    try {
      const state = await window.hymn.createProfile(name)
      setProfilesState(state)
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

  useEffect(() => {
    void loadInstallInfo()
    void loadProfiles()
  }, [])

  const state: AppState = {
    installInfo,
    scanResult,
    worldsState,
    isScanning,
    errorMessage,
    worldError,
    isTogglingMod,
    // Legacy
    profilesState,
    profileError,
    isSwitchingProfile,
  }

  const actions: AppActions = {
    loadInstallInfo,
    loadWorlds,
    runScan,
    handleSelectInstallPath,
    handleSelectWorld,
    handleToggleMod,
    handleDeleteMod,
    handleAddMods,
    setErrorMessage,
    setWorldError,
    // Legacy
    loadProfiles,
    handleCreateProfile,
    handleActivateProfile,
    handleUpdateProfile,
    setProfileError,
  }

  const value: AppContextValue = {
    state,
    actions,
    selectedWorld,
    enabledModIds,
    counts,
    // Legacy
    activeProfile,
  }

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}
