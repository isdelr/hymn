export type ModFormat = 'directory' | 'zip' | 'jar'

export type ModLocation = 'mods' | 'packs' | 'earlyplugins'

export type ModType = 'pack' | 'plugin' | 'early-plugin' | 'unknown'

export interface ModEntry {
  id: string
  name: string
  version?: string
  group?: string
  description?: string
  type: ModType
  format: ModFormat
  location: ModLocation
  path: string
  enabled: boolean
  dependencies: string[]
  optionalDependencies: string[]
  warnings: string[]
  entryPoint: string | null
  includesAssetPack: boolean
}

export interface Profile {
  id: string
  name: string
  enabledMods: string[]
  loadOrder: string[]
  notes?: string
}

export interface ProfilesState {
  activeProfileId: string | null
  profiles: Profile[]
}

export interface BackupSnapshot {
  id: string
  createdAt: string
  profileId: string
  location: string
  mods: string[]
}

export interface ApplyResult {
  profileId: string
  snapshotId: string
  appliedAt: string
  warnings: string[]
}

export interface RollbackResult {
  snapshotId: string
  restoredAt: string
  warnings: string[]
}

export interface InstallInfo {
  defaultPath: string
  detectedPath: string | null
  activePath: string | null
  userDataPath: string | null
  modsPath: string | null
  packsPath: string | null
  earlyPluginsPath: string | null
  issues: string[]
}

export interface ScanResult {
  installPath: string | null
  entries: ModEntry[]
  warnings: string[]
}

export interface HymnApi {
  getInstallInfo: () => Promise<InstallInfo>
  selectInstallPath: () => Promise<InstallInfo>
  scanMods: () => Promise<ScanResult>
  getProfiles: () => Promise<ProfilesState>
  createProfile: (name: string) => Promise<ProfilesState>
  updateProfile: (profile: Profile) => Promise<Profile>
  setActiveProfile: (profileId: string) => Promise<ProfilesState>
  applyProfile: (profileId: string) => Promise<ApplyResult>
  rollbackLastApply: () => Promise<RollbackResult>
}
