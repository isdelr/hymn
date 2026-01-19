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

export type ServerAssetKind = 'item' | 'block' | 'entity' | 'audio' | 'ui' | 'model' | 'texture' | 'script' | 'category' | 'projectile' | 'drop' | 'recipe' | 'barter' | 'prefab' | 'effect' | 'other'

export interface ServerAsset {
  id: string
  name: string
  displayName?: string
  relativePath: string
  absolutePath: string
  kind: ServerAssetKind
  size: number | null
  metadata?: Record<string, unknown>
}

export interface ServerAssetListOptions {
  path: string
  maxAssets?: number
}

export interface ServerAssetListResult {
  assets: ServerAsset[]
}

export type ServerAssetTemplate =
  // Items - Weapons
  | 'item' | 'item_sword' | 'item_pickaxe'
  // Items - Tools
  | 'item_axe' | 'item_shovel' | 'item_hoe' | 'item_fishing_rod'
  // Items - Armor
  | 'item_armor_helmet' | 'item_armor_chestplate' | 'item_armor_leggings' | 'item_armor_boots'
  // Items - Consumables
  | 'item_food' | 'item_potion'
  // Items - Other
  | 'item_ingredient' | 'item_projectile' | 'item_cosmetic'
  // Blocks
  | 'block' | 'block_simple' | 'block_liquid'
  | 'block_furniture' | 'block_crop' | 'block_container'
  // Entities
  | 'entity' | 'entity_npc' | 'entity_mob'
  | 'entity_flying' | 'entity_swimming' | 'entity_boss' | 'entity_passive'
  // Data Types
  | 'drop_weighted' | 'recipe_shaped' | 'recipe_shapeless' | 'barter_shop' | 'projectile'
  // Audio & UI
  | 'audio' | 'audio_sfx'
  | 'ui' | 'ui_page'
  // Misc
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

export interface RenameJavaFileOptions {
  projectPath: string
  relativePath: string
  newClassName: string
}

export interface RenameJavaFileResult {
  success: boolean
  newRelativePath: string
}

export interface DeleteJavaPackageOptions {
  projectPath: string
  packagePath: string
}

export interface DeleteJavaPackageResult {
  success: boolean
  deletedFiles: number
}

export interface RenameJavaPackageOptions {
  projectPath: string
  oldPackagePath: string
  newPackageName: string
}

export interface RenameJavaPackageResult {
  success: boolean
  renamedFiles: number
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

// Dependency validation types
export interface DependencyIssue {
  modId: string
  modName: string
  type: 'missing_dependency' | 'disabled_dependency' | 'optional_missing'
  dependencyId: string
  message: string
}

export interface ModValidationResult {
  issues: DependencyIssue[]
  hasErrors: boolean
  hasWarnings: boolean
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

export interface ApplyResult {
  profileId: string
  appliedAt: string
}

export interface InstallInfo {
  defaultPath: string
  detectedPath: string | null
  activePath: string | null
  userDataPath: string | null
  modsPath: string | null
  earlyPluginsPath: string | null
  issues: string[]
}

export interface ScanResult {
  installPath: string | null
  entries: ModEntry[]
  validation?: ModValidationResult
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

// Deleted mods backup types
export interface DeletedModEntry {
  id: string
  originalName: string
  backupPath: string
  deletedAt: string
  size: number
  format: ModFormat
}

export interface ListDeletedModsResult {
  entries: DeletedModEntry[]
}

export interface RestoreDeletedModOptions {
  backupId: string
  targetLocation: ModLocation
}

export interface RestoreDeletedModResult {
  success: boolean
  restoredPath: string
}

export interface AddModResult {
  success: boolean
  addedPaths: string[]
}

// Build artifact types
export type BuildArtifactType = 'jar' | 'zip'

export interface BuildArtifact {
  id: string
  projectName: string
  version: string
  outputPath: string
  builtAt: string // ISO date string
  durationMs: number
  fileSize: number
  artifactType: BuildArtifactType
  output?: string // Build output/logs
  outputTruncated?: boolean // Whether output was truncated
}

export interface BuildArtifactListResult {
  artifacts: BuildArtifact[]
}

export interface DeleteBuildArtifactOptions {
  artifactId: string
}

export interface DeleteBuildArtifactResult {
  success: boolean
}

export interface ClearAllBuildArtifactsResult {
  success: boolean
  deletedCount: number
}

export interface CopyArtifactToModsResult {
  success: boolean
  destinationPath: string
  replacedPath?: string // Path of previous build that was replaced (if any)
}

// Installed mod file info (for tracking what's in the mods folder)
export interface InstalledModFile {
  fileName: string
  filePath: string
  projectName: string // Extracted from filename (e.g., "MyMod" from "MyMod-1.0.0-build2.jar")
  version: string // Extracted version
  buildNumber: number | null // Extracted build number if present
  artifactType: BuildArtifactType
  installedAt: string // ISO date string
  fileSize: number
}

export interface ListInstalledModsResult {
  mods: InstalledModFile[]
}

// Java dependency detection types
export type JavaDependencyStatus = 'found' | 'missing' | 'incompatible'

export interface JavaDependencyInfo {
  status: JavaDependencyStatus
  jdkPath: string | null
  version: string | null
  issues: string[]
  downloadInstructions: string
}

// JDK Download types
export type JdkDownloadStatus = 'idle' | 'downloading' | 'extracting' | 'complete' | 'error'

export interface JdkDownloadProgress {
  status: JdkDownloadStatus
  bytesDownloaded: number
  totalBytes: number
  message: string
}

export interface JdkDownloadResult {
  success: boolean
  jdkPath?: string
  version?: string
  error?: string
}

// Gradle version type
export type GradleVersion = '9.3.0' | '8.12.0' | '8.5'

// Hytale installation dependency types
export type HytaleDependencyStatus = 'found' | 'missing'

export interface HytaleDependencyInfo {
  status: HytaleDependencyStatus
  hytalePath: string | null
  serverJarPath: string | null
  patchline: string
  issues: string[]
}

export interface CheckDependenciesResult {
  java: JavaDependencyInfo
  hytale: HytaleDependencyInfo
  canBuildPlugins: boolean
  canBuildPacks: boolean // Always true - no dependencies needed
}

// Enhanced build types
export interface BuildPluginOptions {
  projectPath: string
  task?: string
}

export interface BuildPluginResult {
  success: boolean
  exitCode: number | null
  output: string
  durationMs: number
  truncated: boolean
  artifact: BuildArtifact | null
}

export interface BuildPackOptions {
  projectPath: string
}

export interface BuildPackResult {
  success: boolean
  output: string
  durationMs: number
  artifact: BuildArtifact | null
}

// Delete project
export interface DeleteProjectOptions {
  projectPath: string
}

export interface DeleteProjectResult {
  success: boolean
  error?: string
}

// Asset file picker types
export interface SelectAssetFileOptions {
  defaultPath: string // Starting directory for the file picker
  modRoot: string // Root path of the mod, used to compute relative path
  filters?: Array<{ name: string; extensions: string[] }> // File type filters
  title?: string // Dialog title
}

export interface SelectAssetFileResult {
  relativePath: string | null // Relative path from modRoot, or null if canceled
}

// Translation management types
export interface TranslationEntry {
  key: string
  value: string
}

export interface PackLanguageInfo {
  code: string // e.g., "en-US"
  name: string // e.g., "English (US)"
  filePath: string // Full path to .lang file
  entryCount: number
}

export interface ListPackLanguagesOptions {
  packPath: string
}

export interface ListPackLanguagesResult {
  languages: PackLanguageInfo[]
}

export interface GetPackTranslationsOptions {
  packPath: string
  langCode: string
}

export interface GetPackTranslationsResult {
  translations: Record<string, string>
  filePath: string
}

export interface SavePackTranslationsOptions {
  packPath: string
  langCode: string
  translations: Record<string, string>
}

export interface SavePackTranslationsResult {
  success: boolean
}

export interface CreatePackLanguageOptions {
  packPath: string
  langCode: string
}

export interface CreatePackLanguageResult {
  success: boolean
  filePath: string
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
  exportModpack: (options: ExportModpackOptions) => Promise<ExportModpackResult>
  importModpack: () => Promise<ImportModpackResult>
  // World-based mod export/import
  exportWorldMods: (options: ExportWorldModsOptions) => Promise<ExportWorldModsResult>
  importWorldMods: () => Promise<ImportWorldModsResult>
  // Projects folder management
  listProjects: () => Promise<ListProjectsResult>
  deleteProject: (options: DeleteProjectOptions) => Promise<DeleteProjectResult>
  installProject: (options: InstallProjectOptions) => Promise<InstallProjectResult>
  uninstallProject: (options: UninstallProjectOptions) => Promise<UninstallProjectResult>
  // Package mod (zip creation)
  packageMod: (options: PackageModOptions) => Promise<PackageModResult>
  openInExplorer: (path: string) => Promise<void>
  listProjectFiles: (options: ListProjectFilesOptions) => Promise<ListProjectFilesResult>
  readFile: (path: string) => Promise<string>
  saveFile: (path: string, content: string) => Promise<{ success: boolean }>
  checkPathExists: (path: string) => Promise<boolean>
  selectAssetFile: (options: SelectAssetFileOptions) => Promise<SelectAssetFileResult>
  // Java source file management for plugins
  listJavaSources: (options: ListJavaSourcesOptions) => Promise<ListJavaSourcesResult>
  createJavaClass: (options: CreateJavaClassOptions) => Promise<CreateJavaClassResult>
  deleteJavaClass: (options: { projectPath: string; relativePath: string }) => Promise<{ success: boolean }>
  renameJavaFile: (options: RenameJavaFileOptions) => Promise<RenameJavaFileResult>
  deleteJavaPackage: (options: DeleteJavaPackageOptions) => Promise<DeleteJavaPackageResult>
  renameJavaPackage: (options: RenameJavaPackageOptions) => Promise<RenameJavaPackageResult>
  // Build workflow methods
  checkDependencies: () => Promise<CheckDependenciesResult>
  buildPlugin: (options: BuildPluginOptions) => Promise<BuildPluginResult>
  buildPack: (options: BuildPackOptions) => Promise<BuildPackResult>
  listBuildArtifacts: () => Promise<BuildArtifactListResult>
  deleteBuildArtifact: (options: DeleteBuildArtifactOptions) => Promise<DeleteBuildArtifactResult>
  clearAllBuildArtifacts: () => Promise<ClearAllBuildArtifactsResult>
  revealBuildArtifact: (artifactId: string) => Promise<void>
  copyArtifactToMods: (artifactId: string) => Promise<CopyArtifactToModsResult>
  listInstalledMods: () => Promise<ListInstalledModsResult>
  openBuildsFolder: () => Promise<void>
  // Open file/folder in default editor (uses OS "Open With" dialog)
  openInEditor: (path: string) => Promise<void>
  // Deleted mods management
  listDeletedMods: () => Promise<ListDeletedModsResult>
  restoreDeletedMod: (options: RestoreDeletedModOptions) => Promise<RestoreDeletedModResult>
  permanentlyDeleteMod: (options: { backupId: string }) => Promise<{ success: boolean }>
  clearDeletedMods: () => Promise<{ success: boolean; deletedCount: number }>
  // Translation management
  listPackLanguages: (options: ListPackLanguagesOptions) => Promise<ListPackLanguagesResult>
  getPackTranslations: (options: GetPackTranslationsOptions) => Promise<GetPackTranslationsResult>
  savePackTranslations: (options: SavePackTranslationsOptions) => Promise<SavePackTranslationsResult>
  createPackLanguage: (options: CreatePackLanguageOptions) => Promise<CreatePackLanguageResult>
}

// Window control API for frameless window
export interface HymnWindowApi {
  minimize: () => Promise<void>
  maximize: () => Promise<void>
  close: () => Promise<void>
  isMaximized: () => Promise<boolean>
  onMaximizedChange: (callback: (isMaximized: boolean) => void) => () => void
}

// Theme types
export type ThemeMode = 'light' | 'dark' | 'system'

export type ModSortOrder = 'name' | 'type' | 'size'

export interface HymnThemeApi {
  get: () => Promise<boolean> // returns shouldUseDarkColors
  set: (theme: ThemeMode) => Promise<void>
  onChange: (callback: (isDark: boolean) => void) => () => void
}

export interface HymnSettingsApi {
  getTheme: () => Promise<ThemeMode>
  setTheme: (theme: ThemeMode) => Promise<void>
  getModSortOrder: () => Promise<ModSortOrder>
  setModSortOrder: (order: ModSortOrder) => Promise<void>
  getDefaultExportPath: () => Promise<string | null>
  setDefaultExportPath: (path: string | null) => Promise<void>
  selectDefaultExportPath: () => Promise<string | null>
  // JDK path configuration
  getJdkPath: () => Promise<string | null>
  setJdkPath: (path: string | null) => Promise<void>
  selectJdkPath: () => Promise<string | null>
  // Managed JDK (auto-downloaded)
  getManagedJdkPath: () => Promise<string | null>
  downloadJdk: () => Promise<JdkDownloadResult>
  cancelJdkDownload: () => Promise<void>
  onJdkDownloadProgress: (callback: (progress: JdkDownloadProgress) => void) => () => void
  // HytaleServer.jar path configuration
  getServerJarPath: () => Promise<string | null>
  setServerJarPath: (path: string | null) => Promise<void>
  selectServerJarPath: () => Promise<string | null>
  // Gradle version configuration
  getGradleVersion: () => Promise<GradleVersion>
  setGradleVersion: (version: GradleVersion) => Promise<void>
}

// File watcher types
export type FileChangeType = 'java' | 'manifest' | 'asset' | 'other'

export interface FileChangeEvent {
  projectPath: string
  filePath: string
  relativePath: string
  eventType: 'rename' | 'change'
  changeType: FileChangeType
}

export interface WatchProjectResult {
  success: boolean
  error?: string
}

// Directory watcher types (for automatic refresh)
export interface DirectoryChangeEvent {
  directory: 'projects' | 'builds' | 'mods'
  eventType: 'add' | 'change' | 'unlink'
  path: string
}

// World config watcher type (for external mod toggle detection)
export interface WorldConfigChangeEvent {
  worldId: string
}

export interface HymnFileWatcherApi {
  watchProject: (projectPath: string) => Promise<WatchProjectResult>
  unwatchProject: () => Promise<{ success: boolean }>
  onFileChange: (callback: (event: FileChangeEvent) => void) => () => void
  // Directory watcher methods
  startModsWatcher: (modsPath: string | null, earlyPluginsPath: string | null) => Promise<void>
  stopModsWatcher: () => Promise<void>
  startProjectsWatcher: () => Promise<void>
  stopProjectsWatcher: () => Promise<void>
  startBuildsWatcher: () => Promise<void>
  stopBuildsWatcher: () => Promise<void>
  onProjectsChange: (callback: (event: DirectoryChangeEvent) => void) => () => void
  onBuildsChange: (callback: (event: DirectoryChangeEvent) => void) => () => void
  onModsChange: (callback: (event: DirectoryChangeEvent) => void) => () => void
  // World config watcher methods
  startWorldConfigWatcher: (savesPath: string) => Promise<void>
  stopWorldConfigWatcher: () => Promise<void>
  onWorldConfigChange: (callback: (event: WorldConfigChangeEvent) => void) => () => void
}

// Global window augmentation
declare global {
  interface Window {
    hymn: HymnApi
    hymnWindow: HymnWindowApi
    hymnTheme: HymnThemeApi
    hymnSettings: HymnSettingsApi
    hymnFileWatcher: HymnFileWatcherApi
  }
}
