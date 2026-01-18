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
}

export interface ModManifestOptions {
  path: string
  format: ModFormat
}

export interface ModManifestResult {
  manifestPath: string | null
  content: string | null
  readOnly: boolean
}

export interface SaveManifestOptions {
  path: string
  format: ModFormat
  content: string
}

export interface SaveManifestResult {
  success: boolean
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

export type ServerAssetKind = 'item' | 'block' | 'entity' | 'audio' | 'ui' | 'model' | 'texture' | 'script' | 'category' | 'other'

export interface ServerAsset {
  id: string
  name: string
  displayName?: string
  relativePath: string
  absolutePath: string
  kind: ServerAssetKind
  size: number | null
  metadata?: Record<string, any>
}

export interface ServerAssetListOptions {
  path: string
  maxAssets?: number
}

export interface ServerAssetListResult {
  assets: ServerAsset[]
}

export type ServerAssetTemplate =
  | 'item' | 'item_sword' | 'item_pickaxe'
  | 'block' | 'block_simple' | 'block_liquid'
  | 'entity' | 'entity_npc' | 'entity_mob'
  | 'audio' | 'audio_sfx'
  | 'ui' | 'ui_page'
  | 'category' | 'empty'

// Java class templates for plugins
export type JavaClassTemplate =
  | 'command'           // Chat command handler
  | 'event_listener'    // Game event listener
  | 'component'         // Entity component
  | 'custom_class'      // Empty class template

export interface CreateJavaClassOptions {
  projectPath: string          // Root path of the plugin project
  packagePath: string          // Relative package path (e.g., "commands")
  className: string            // Class name (e.g., "HelloCommand")
  template: JavaClassTemplate
}

export interface CreateJavaClassResult {
  success: boolean
  filePath: string
  relativePath: string
}

export interface JavaSourceFile {
  id: string
  name: string                 // ClassName.java
  className: string
  packageName: string          // com.example.myplugin.commands
  relativePath: string
  absolutePath: string
}

export interface ListJavaSourcesOptions {
  projectPath: string
}

export interface ListJavaSourcesResult {
  sources: JavaSourceFile[]
  basePackage: string
  sourceRoot: string
}

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
  entryPoint: string | null
  includesAssetPack: boolean
  size?: number // File/folder size in bytes
}

export interface Profile {
  id: string
  name: string
  enabledMods: string[]
  readonly?: boolean
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
}

export interface RollbackResult {
  snapshotId: string
  restoredAt: string
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
}

export interface PackManifest {
  Name: string
  Group?: string
  Version?: string
  Description?: string
  Authors?: Array<{ Name: string; Email?: string; Url?: string }>
  Website?: string
  ServerVersion?: string
  Dependencies?: Record<string, string>
  OptionalDependencies?: Record<string, string>
  LoadBefore?: Record<string, string>
  DisabledByDefault?: boolean
  Main?: string
  IncludesAssetPack?: boolean
  SubPlugins?: string[]
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
}

export interface CreatePluginOptions {
  name: string
  group: string // e.g., "com.example" - required for Java package structure
  version?: string
  description?: string
  authorName?: string
  includesAssetPack?: boolean
  patchline?: 'release' | 'pre-release'
  javaVersion?: number
}

export interface CreatePluginResult {
  success: boolean
  path: string
  manifestPath: string
  mainClassPath: string
}

export interface FileNode {
  name: string
  type: 'file' | 'directory'
  path: string
  parentPath: string | null
  children?: FileNode[]
}

export interface ListProjectFilesOptions {
  path: string
  recursive?: boolean
}

export interface ListProjectFilesResult {
  root: FileNode
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
}

// World-based mod export/import types
export interface ExportWorldModsOptions {
  worldId: string
}

export interface ExportWorldModsResult {
  success: boolean
  outputPath: string
  modCount: number
}

export interface ImportWorldModsResult {
  success: boolean
  modsImported: number
  modsSkipped: number
}

// Projects folder types
export interface ProjectEntry extends ModEntry {
  isInstalled: boolean
  installedPath?: string
}

export interface ListProjectsResult {
  projects: ProjectEntry[]
}

export interface InstallProjectOptions {
  projectPath: string
  projectType: 'pack' | 'plugin'
}

export interface InstallProjectResult {
  success: boolean
  installedPath: string
}

export interface UninstallProjectOptions {
  projectPath: string
}

export interface UninstallProjectResult {
  success: boolean
}

// Package mod (zip) types
export interface PackageModOptions {
  path: string
  outputPath?: string
}

export interface PackageModResult {
  success: boolean
  outputPath: string
}

// World-based mod management types
export interface WorldInfo {
  id: string // Folder name (unique identifier)
  name: string // Display name
  path: string // Full path to world folder
  configPath: string // Path to config.json
  previewPath: string | null // Path to preview.png if exists
  previewDataUrl: string | null // Base64 preview image for UI
  lastModified: string // ISO date string from folder mtime
}

export interface WorldModConfig {
  [modId: string]: {
    Enabled: boolean
  }
}

export interface WorldConfig {
  Mods?: WorldModConfig
  [key: string]: unknown // Preserve other config properties
}

export interface WorldsState {
  worlds: WorldInfo[]
  selectedWorldId: string | null
}

export interface SetModEnabledOptions {
  worldId: string
  modId: string
  enabled: boolean
}

export interface SetModEnabledResult {
  success: boolean
}

export interface DeleteModOptions {
  modId: string
  modPath: string
}

export interface DeleteModResult {
  success: boolean
  backupPath: string
}

export interface AddModResult {
  success: boolean
  addedPaths: string[]
}

export interface HymnApi {
  getInstallInfo: () => Promise<InstallInfo>
  selectInstallPath: () => Promise<InstallInfo>
  scanMods: (worldId?: string) => Promise<ScanResult>
  // Legacy profile methods (kept for backwards compatibility)
  getProfiles: () => Promise<ProfilesState>
  createProfile: (name: string) => Promise<ProfilesState>
  updateProfile: (profile: Profile) => Promise<Profile>
  setActiveProfile: (profileId: string) => Promise<ProfilesState>
  applyProfile: (profileId: string) => Promise<ApplyResult>
  rollbackLastApply: () => Promise<RollbackResult>
  // World management methods
  getWorlds: () => Promise<WorldsState>
  getWorldConfig: (worldId: string) => Promise<WorldConfig | null>
  setModEnabled: (options: SetModEnabledOptions) => Promise<SetModEnabledResult>
  setSelectedWorld: (worldId: string) => Promise<void>
  // Mod management methods
  deleteMod: (options: DeleteModOptions) => Promise<DeleteModResult>
  addMods: () => Promise<AddModResult>
  // Pack/mod creation and editing
  createPack: (options: CreatePackOptions) => Promise<CreatePackResult>
  createPlugin: (options: CreatePluginOptions) => Promise<CreatePluginResult>
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
  // World-based mod export/import
  exportWorldMods: (options: ExportWorldModsOptions) => Promise<ExportWorldModsResult>
  importWorldMods: () => Promise<ImportWorldModsResult>
  // Projects folder management
  listProjects: () => Promise<ListProjectsResult>
  installProject: (options: InstallProjectOptions) => Promise<InstallProjectResult>
  uninstallProject: (options: UninstallProjectOptions) => Promise<UninstallProjectResult>
  // Package mod (zip creation)
  packageMod: (options: PackageModOptions) => Promise<PackageModResult>
  openInExplorer: (path: string) => Promise<void>
  listProjectFiles: (options: ListProjectFilesOptions) => Promise<ListProjectFilesResult>
  readFile: (path: string) => Promise<string>
  saveFile: (path: string, content: string) => Promise<{ success: boolean }>
  checkPathExists: (path: string) => Promise<boolean>
  // Java source file management for plugins
  listJavaSources: (options: ListJavaSourcesOptions) => Promise<ListJavaSourcesResult>
  createJavaClass: (options: CreateJavaClassOptions) => Promise<CreateJavaClassResult>
  deleteJavaClass: (options: { projectPath: string; relativePath: string }) => Promise<{ success: boolean }>
}

// Window control API for frameless window
export interface HymnWindowApi {
  minimize: () => Promise<void>
  maximize: () => Promise<void>
  close: () => Promise<void>
  isMaximized: () => Promise<boolean>
  onMaximizedChange: (callback: (isMaximized: boolean) => void) => () => void
}

// Global window augmentation
declare global {
  interface Window {
    hymn: HymnApi
    hymnWindow: HymnWindowApi
  }
}
