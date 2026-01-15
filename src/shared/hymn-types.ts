export type ModFormat = 'directory' | 'zip' | 'jar'

export type ModLocation = 'mods' | 'packs' | 'earlyplugins'

export type ModType = 'pack' | 'plugin' | 'early-plugin' | 'unknown'

export type ModAssetKind = 'texture' | 'model' | 'animation' | 'audio' | 'other'

export interface ModAsset {
  id: string
  name: string
  relativePath: string
  kind: ModAssetKind
  size: number | null
  previewDataUrl?: string
}

export interface ModAssetsOptions {
  path: string
  format: ModFormat
  includePreviews?: boolean
  maxPreviews?: number
  maxPreviewBytes?: number
  maxAssets?: number
}

export interface ModAssetsResult {
  assets: ModAsset[]
  warnings: string[]
}

export interface ModManifestOptions {
  path: string
  format: ModFormat
}

export interface ModManifestResult {
  manifestPath: string | null
  content: string | null
  warnings: string[]
  readOnly: boolean
}

export interface SaveManifestOptions {
  path: string
  format: ModFormat
  content: string
}

export interface SaveManifestResult {
  success: boolean
  warnings: string[]
}

export interface ModBuildOptions {
  path: string
  task?: string
}

export interface ModBuildResult {
  success: boolean
  exitCode: number | null
  output: string
  durationMs: number
  truncated: boolean
}

export type ServerAssetKind = 'item' | 'block' | 'category' | 'other'

export interface ServerAsset {
  id: string
  name: string
  relativePath: string
  absolutePath: string
  kind: ServerAssetKind
  size: number | null
}

export interface ServerAssetListOptions {
  path: string
  maxAssets?: number
}

export interface ServerAssetListResult {
  assets: ServerAsset[]
  warnings: string[]
}

export type ServerAssetTemplate = 'item' | 'block' | 'category' | 'empty'

export interface CreateServerAssetOptions {
  path: string
  destination: string
  name: string
  template: ServerAssetTemplate
}

export interface DuplicateServerAssetOptions {
  path: string
  source: string
  destination: string
}

export interface MoveServerAssetOptions {
  path: string
  source: string
  destination: string
}

export interface DeleteServerAssetOptions {
  path: string
  relativePath: string
}

export interface ServerAssetMutationResult {
  success: boolean
  asset: ServerAsset
  warnings: string[]
}

export interface DeleteServerAssetResult {
  success: boolean
}

export type VanillaAssetSourceType = 'zip' | 'filesystem'

export interface VanillaAssetEntry {
  id: string
  name: string
  sourceType: VanillaAssetSourceType
  sourcePath?: string
  archivePath?: string
  entryPath?: string
  relativePath: string
  originRoot: string
  size: number | null
}

export interface VanillaAssetListOptions {
  maxAssets?: number
  maxRoots?: number
  offset?: number
  limit?: number
}

export interface VanillaAssetListResult {
  assets: VanillaAssetEntry[]
  warnings: string[]
  roots: string[]
  hasMore: boolean
  nextOffset: number
}

export interface ImportVanillaAssetOptions {
  sourceType: VanillaAssetSourceType
  sourcePath?: string
  archivePath?: string
  entryPath?: string
  destinationPath: string
  destinationRelativePath: string
}

export interface ImportVanillaAssetResult {
  success: boolean
  asset: ServerAsset
  warnings: string[]
}

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

export interface PackManifest {
  Name: string
  Group?: string
  Version?: string
  Description?: string
  Authors?: Array<{ Name: string; Email?: string; Url?: string }>
  Website?: string
  ServerVersion?: string
  Dependencies?: string[]
  OptionalDependencies?: string[]
  DisabledByDefault?: boolean
  Main?: string
  IncludesAssetPack?: boolean
}

export interface CreatePackOptions {
  name: string
  group?: string
  version?: string
  description?: string
  authorName?: string
  authorEmail?: string
  location: 'packs' | 'mods'
  includeCommon?: boolean
  includeServer?: boolean
}

export interface CreatePackResult {
  success: boolean
  path: string
  manifestPath: string
  warnings: string[]
}

export interface BackupInfo {
  id: string
  createdAt: string
  profileId: string
  modCount: number
}

export interface ExportModpackOptions {
  profileId: string
  outputPath?: string
  includeMods?: boolean
}

export interface ExportModpackResult {
  success: boolean
  outputPath: string
  modCount: number
}

export interface ImportModpackResult {
  success: boolean
  profileId: string
  modCount: number
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
  createPack: (options: CreatePackOptions) => Promise<CreatePackResult>
  getModManifest: (options: ModManifestOptions) => Promise<ModManifestResult>
  saveModManifest: (options: SaveManifestOptions) => Promise<SaveManifestResult>
  listModAssets: (options: ModAssetsOptions) => Promise<ModAssetsResult>
  buildMod: (options: ModBuildOptions) => Promise<ModBuildResult>
  listServerAssets: (options: ServerAssetListOptions) => Promise<ServerAssetListResult>
  createServerAsset: (options: CreateServerAssetOptions) => Promise<ServerAssetMutationResult>
  duplicateServerAsset: (options: DuplicateServerAssetOptions) => Promise<ServerAssetMutationResult>
  moveServerAsset: (options: MoveServerAssetOptions) => Promise<ServerAssetMutationResult>
  deleteServerAsset: (options: DeleteServerAssetOptions) => Promise<DeleteServerAssetResult>
  listVanillaAssets: (options: VanillaAssetListOptions) => Promise<VanillaAssetListResult>
  importVanillaAsset: (options: ImportVanillaAssetOptions) => Promise<ImportVanillaAssetResult>
  getBackups: () => Promise<BackupInfo[]>
  restoreBackup: (backupId: string) => Promise<RollbackResult>
  deleteBackup: (backupId: string) => Promise<{ success: boolean }>
  exportModpack: (options: ExportModpackOptions) => Promise<ExportModpackResult>
  importModpack: () => Promise<ImportModpackResult>
  openInExplorer: (path: string) => Promise<void>
}
