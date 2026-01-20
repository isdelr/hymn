import { vi } from 'vitest'
import type {
  HymnApi,
  HymnFileWatcherApi,
  InstallInfo,
  ModEntry,
  Profile,
  ProfilesState,
  ScanResult,
  ProjectEntry,
  BuildArtifact,
} from '@/shared/hymn-types'

declare global {
  interface Window {
    hymn: HymnApi
    hymnFileWatcher: HymnFileWatcherApi
  }
}

export type Fixtures = {
  entries: ModEntry[]
  installInfo: InstallInfo
  profilesState: ProfilesState
  scanResult: ScanResult
}

export const createFixtures = (): Fixtures => {
  const entries: ModEntry[] = [
    {
      id: 'alpha-pack',
      name: 'Alpha Pack',
      version: '1.0.0',
      group: 'core',
      description: 'Core pack',
      type: 'pack',
      format: 'zip',
      location: 'mods',
      path: '/mods/alpha.zip',
      enabled: true,
      dependencies: ['beta-plugin'],
      optionalDependencies: [],
      entryPoint: null,
      includesAssetPack: true,
    },
    {
      id: 'beta-plugin',
      name: 'Beta Plugin',
      version: '2.1.0',
      group: 'addons',
      description: 'Sample plugin',
      type: 'plugin',
      format: 'jar',
      location: 'packs',
      path: '/packs/beta.jar',
      enabled: false,
      dependencies: [],
      optionalDependencies: [],
      entryPoint: null,
      includesAssetPack: false,
    },
    {
      id: 'gamma-early',
      name: 'Gamma Early',
      version: '0.9.0',
      group: 'core',
      description: 'Early plugin',
      type: 'early-plugin',
      format: 'directory',
      location: 'earlyplugins',
      path: '/early/gamma',
      enabled: true,
      dependencies: [],
      optionalDependencies: [],
      entryPoint: null,
      includesAssetPack: false,
    },
  ]

  const installInfo: InstallInfo = {
    defaultPath: 'C:\\Hytale\\Default',
    detectedPath: 'C:\\Hytale',
    activePath: 'C:\\Hytale',
    userDataPath: 'C:\\Hytale\\User',
    modsPath: 'C:\\Hytale\\mods',
    earlyPluginsPath: 'C:\\Hytale\\early',
    issues: ['Permissions warning'],
  }

  const activeProfile: Profile = {
    id: 'profile-1',
    name: 'Default',
    enabledMods: ['alpha-pack', 'beta-plugin', 'gamma-early'],
    readonly: true,
  }

  const profilesState: ProfilesState = {
    activeProfileId: activeProfile.id,
    profiles: [
      activeProfile,
      {
        id: 'profile-2',
        name: 'Experimental',
        enabledMods: [],
      },
    ],
  }

  const scanResult: ScanResult = {
    installPath: installInfo.activePath,
    entries,
  }

  return { entries, installInfo, profilesState, scanResult }
}

export const createProjectEntry = (overrides: Partial<ProjectEntry> = {}): ProjectEntry => ({
  id: 'project-1',
  name: 'TestProject',
  path: 'C:\\Hytale\\projects\\TestProject',
  type: 'pack',
  format: 'directory',
  location: 'packs',
  version: '1.0.0',
  description: 'Test project description',
  enabled: true,
  dependencies: [],
  optionalDependencies: [],
  entryPoint: null,
  includesAssetPack: false,
  isInstalled: false,
  installedPath: undefined,
  ...overrides,
})

export const createBuildArtifact = (overrides: Partial<BuildArtifact> = {}): BuildArtifact => ({
  id: 'artifact-1',
  projectName: 'TestProject',
  version: '1.0.0',
  outputPath: 'C:\\Users\\test\\AppData\\hymn\\builds\\TestProject-1.0.0.zip',
  builtAt: '2026-01-01T00:00:00Z',
  durationMs: 1200,
  fileSize: 51200,
  artifactType: 'zip',
  ...overrides,
})

export const buildHymnApi = (fixtures: Fixtures, overrides: Partial<HymnApi> = {}): HymnApi => {
  const api: HymnApi = {
    getInstallInfo: vi.fn().mockResolvedValue(fixtures.installInfo),
    selectInstallPath: vi.fn().mockResolvedValue(fixtures.installInfo),
    scanMods: vi.fn().mockResolvedValue(fixtures.scanResult),
    getProfiles: vi.fn().mockResolvedValue(fixtures.profilesState),
    createProfile: vi.fn().mockResolvedValue(fixtures.profilesState),
    updateProfile: vi.fn().mockImplementation(async (profile: Profile) => profile),
    setActiveProfile: vi.fn().mockResolvedValue(fixtures.profilesState),
    applyProfile: vi.fn().mockResolvedValue({
      profileId: fixtures.profilesState.activeProfileId ?? 'profile-1',
      appliedAt: '2026-01-01T00:00:00Z',
    }),
    createPack: vi.fn().mockResolvedValue({
      success: true,
      path: 'C:\\Hytale\\packs\\TestPack',
      manifestPath: 'C:\\Hytale\\packs\\TestPack\\manifest.json',
    }),
    createPlugin: vi.fn().mockResolvedValue({
      success: true,
      path: 'C:\\Hytale\\mods\\TestPlugin',
      manifestPath: 'C:\\Hytale\\mods\\TestPlugin\\src\\main\\resources\\manifest.json',
      mainClassPath: 'C:\\Hytale\\mods\\TestPlugin\\src\\main\\java\\com\\example\\TestPlugin.java',
    }),
    getModManifest: vi.fn().mockResolvedValue({
      manifestPath: 'C:\\Hytale\\packs\\TestPack\\manifest.json',
      content: '{"Name":"TestPack"}',
      readOnly: false,
    }),
    saveModManifest: vi.fn().mockResolvedValue({
      success: true,
    }),
    listModAssets: vi.fn().mockResolvedValue({
      assets: [],
    }),
    buildMod: vi.fn().mockResolvedValue({
      success: true,
      exitCode: 0,
      output: '',
      durationMs: 1200,
      truncated: false,
    }),
    listServerAssets: vi.fn().mockResolvedValue({
      assets: [],
    }),
    createServerAsset: vi.fn().mockResolvedValue({
      success: true,
      asset: {
        id: 'Server/Item/Items/sample.json',
        name: 'sample.json',
        relativePath: 'Server/Item/Items/sample.json',
        absolutePath: 'C:\\Hytale\\packs\\TestPack\\Server\\Item\\Items\\sample.json',
        kind: 'item',
        size: 42,
      },
    }),
    duplicateServerAsset: vi.fn().mockResolvedValue({
      success: true,
      asset: {
        id: 'Server/Item/Items/sample-copy.json',
        name: 'sample-copy.json',
        relativePath: 'Server/Item/Items/sample-copy.json',
        absolutePath: 'C:\\Hytale\\packs\\TestPack\\Server\\Item\\Items\\sample-copy.json',
        kind: 'item',
        size: 42,
      },
    }),
    moveServerAsset: vi.fn().mockResolvedValue({
      success: true,
      asset: {
        id: 'Server/Item/Items/sample-moved.json',
        name: 'sample-moved.json',
        relativePath: 'Server/Item/Items/sample-moved.json',
        absolutePath: 'C:\\Hytale\\packs\\TestPack\\Server\\Item\\Items\\sample-moved.json',
        kind: 'item',
        size: 42,
      },
    }),
    deleteServerAsset: vi.fn().mockResolvedValue({ success: true }),
    listVanillaAssets: vi.fn().mockResolvedValue({
      assets: [],
      roots: ['C:\\Hytale\\install\\release\\package\\game\\latest\\Assets.zip'],
      hasMore: false,
      nextOffset: 0,
    }),
    importVanillaAsset: vi.fn().mockResolvedValue({
      success: true,
      asset: {
        id: 'Server/Item/Items/vanilla.json',
        name: 'vanilla.json',
        relativePath: 'Server/Item/Items/vanilla.json',
        absolutePath: 'C:\\Hytale\\packs\\TestPack\\Server\\Item\\Items\\vanilla.json',
        kind: 'item',
        size: 42,
      },
    }),
    exportModpack: vi.fn().mockResolvedValue({
      success: true,
      outputPath: 'C:\\Downloads\\modpack.hymnpack',
      modCount: 3,
    }),
    importModpack: vi.fn().mockResolvedValue({
      success: true,
      profileId: 'imported-profile',
      modCount: 2,
    }),
    exportWorldMods: vi.fn().mockResolvedValue({
      success: true,
      outputPath: 'C:\\Downloads\\world_mods.hymnmods',
      modCount: 2,
    }),
    importWorldMods: vi.fn().mockResolvedValue({
      success: true,
      modsImported: 2,
      modsSkipped: 1,
    }),
    listProjects: vi.fn().mockResolvedValue({
      projects: [],
    }),
    installProject: vi.fn().mockResolvedValue({
      success: true,
      installedPath: 'C:\\Hytale\\UserData\\Mods\\TestPack',
    }),
    uninstallProject: vi.fn().mockResolvedValue({
      success: true,
    }),
    packageMod: vi.fn().mockResolvedValue({
      success: true,
      outputPath: 'C:\\Downloads\\TestPack.zip',
    }),
    openInExplorer: vi.fn().mockResolvedValue(undefined),
    getWorlds: vi.fn().mockResolvedValue({
      worlds: [
        {
          id: 'TestWorld',
          name: 'TestWorld',
          path: 'C:\\Hytale\\UserData\\Saves\\TestWorld',
          configPath: 'C:\\Hytale\\UserData\\Saves\\TestWorld\\config.json',
          previewPath: null,
          previewDataUrl: null,
          lastModified: '2026-01-01T00:00:00Z',
        },
      ],
      selectedWorldId: 'TestWorld',
    }),
    getWorldConfig: vi.fn().mockResolvedValue({
      Mods: {},
    }),
    setModEnabled: vi.fn().mockResolvedValue({
      success: true,
    }),
    setSelectedWorld: vi.fn().mockResolvedValue(undefined),
    deleteMod: vi.fn().mockResolvedValue({
      success: true,
      backupPath: 'C:\\Users\\test\\AppData\\hymn\\deleted-mods\\TestMod_2026-01-01',
    }),
    addMods: vi.fn().mockResolvedValue({
      success: true,
      addedPaths: ['C:\\Hytale\\UserData\\Mods\\TestMod.zip'],
    }),
    listProjectFiles: vi.fn().mockResolvedValue({
      root: {
        name: 'TestPack',
        type: 'directory',
        path: 'C:\\Hytale\\packs\\TestPack',
        parentPath: null,
        children: [],
      },
    }),
    readFile: vi.fn().mockResolvedValue(''),
    saveFile: vi.fn().mockResolvedValue({ success: true }),
    checkPathExists: vi.fn().mockResolvedValue(true),
    selectAssetFile: vi.fn().mockResolvedValue({ relativePath: null }),
    listJavaSources: vi.fn().mockResolvedValue({
      sources: [],
      basePackage: 'com.example',
      sourceRoot: 'C:\\Hytale\\mods\\TestPlugin\\src\\main\\java',
    }),
    createJavaClass: vi.fn().mockResolvedValue({
      success: true,
      filePath: 'C:\\Hytale\\mods\\TestPlugin\\src\\main\\java\\com\\example\\TestClass.java',
      relativePath: 'com/example/TestClass.java',
    }),
    deleteJavaClass: vi.fn().mockResolvedValue({ success: true }),
    renameJavaFile: vi.fn().mockResolvedValue({ success: true, newRelativePath: 'com/example/NewClass.java' }),
    deleteJavaPackage: vi.fn().mockResolvedValue({ success: true, deletedFiles: 1 }),
    renameJavaPackage: vi.fn().mockResolvedValue({ success: true, renamedFiles: 1 }),
    checkDependencies: vi.fn().mockResolvedValue({
      java: {
        status: 'found',
        jdkPath: 'C:\\Program Files\\Java\\jdk-21',
        version: '21.0.1',
        issues: [],
        downloadInstructions: '',
      },
      canBuildPlugins: true,
      canBuildPacks: true,
    }),
    buildPlugin: vi.fn().mockResolvedValue({
      success: true,
      exitCode: 0,
      output: 'Build successful',
      durationMs: 5000,
      truncated: false,
      artifact: {
        id: 'test-artifact-1',
        projectName: 'TestPlugin',
        version: '1.0.0',
        outputPath: 'C:\\Users\\test\\AppData\\hymn\\builds\\plugins\\TestPlugin\\TestPlugin-1.0.0.jar',
        builtAt: '2026-01-01T00:00:00Z',
        durationMs: 5000,
        fileSize: 102400,
        artifactType: 'jar',
      },
    }),
    buildPack: vi.fn().mockResolvedValue({
      success: true,
      output: 'Build successful',
      durationMs: 1000,
      artifact: {
        id: 'test-artifact-2',
        projectName: 'TestPack',
        version: '1.0.0',
        outputPath: 'C:\\Users\\test\\AppData\\hymn\\builds\\packs\\TestPack\\TestPack-1.0.0.zip',
        builtAt: '2026-01-01T00:00:00Z',
        durationMs: 1000,
        fileSize: 51200,
        artifactType: 'zip',
      },
    }),
    listBuildArtifacts: vi.fn().mockResolvedValue({
      artifacts: [],
    }),
    deleteBuildArtifact: vi.fn().mockResolvedValue({
      success: true,
    }),
    clearAllBuildArtifacts: vi.fn().mockResolvedValue({
      success: true,
      deletedCount: 0,
    }),
    revealBuildArtifact: vi.fn().mockResolvedValue(undefined),
    copyArtifactToMods: vi.fn().mockResolvedValue({
      success: true,
      destinationPath: 'C:\\Hytale\\UserData\\Mods\\TestPlugin-1.0.0.jar',
    }),
    listInstalledMods: vi.fn().mockResolvedValue({
      mods: [],
    }),
    openBuildsFolder: vi.fn().mockResolvedValue(undefined),
    openInEditor: vi.fn().mockResolvedValue(undefined),
    // Deleted mods management
    listDeletedMods: vi.fn().mockResolvedValue({ entries: [] }),
    restoreDeletedMod: vi.fn().mockResolvedValue({ success: true, restoredPath: '' }),
    permanentlyDeleteMod: vi.fn().mockResolvedValue({ success: true }),
    clearDeletedMods: vi.fn().mockResolvedValue({ success: true, deletedCount: 0 }),
    // Translation management
    listPackLanguages: vi.fn().mockResolvedValue({ languages: [] }),
    getPackTranslations: vi.fn().mockResolvedValue({ translations: {}, filePath: '' }),
    savePackTranslations: vi.fn().mockResolvedValue({ success: true }),
    createPackLanguage: vi.fn().mockResolvedValue({ success: true, filePath: '' }),
    deleteProject: vi.fn().mockResolvedValue({
      success: true,
    }),
    readBinaryFile: vi.fn().mockResolvedValue({
      success: true,
      dataUrl: 'data:image/png;base64,TEST',
      size: 1024,
    }),
  }

  const merged = { ...api, ...overrides } as HymnApi
  window.hymn = merged
  return merged
}

export const buildHymnFileWatcherApi = (overrides: Partial<HymnFileWatcherApi> = {}): HymnFileWatcherApi => {
  const api: HymnFileWatcherApi = {
    watchProject: vi.fn().mockResolvedValue({ success: true }),
    unwatchProject: vi.fn().mockResolvedValue({ success: true }),
    onFileChange: vi.fn().mockReturnValue(() => {}),
    startModsWatcher: vi.fn().mockResolvedValue(undefined),
    stopModsWatcher: vi.fn().mockResolvedValue(undefined),
    startProjectsWatcher: vi.fn().mockResolvedValue(undefined),
    stopProjectsWatcher: vi.fn().mockResolvedValue(undefined),
    startBuildsWatcher: vi.fn().mockResolvedValue(undefined),
    stopBuildsWatcher: vi.fn().mockResolvedValue(undefined),
    onProjectsChange: vi.fn().mockReturnValue(() => {}),
    onBuildsChange: vi.fn().mockReturnValue(() => {}),
    onModsChange: vi.fn().mockReturnValue(() => {}),
    startWorldConfigWatcher: vi.fn().mockResolvedValue(undefined),
    stopWorldConfigWatcher: vi.fn().mockResolvedValue(undefined),
    onWorldConfigChange: vi.fn().mockReturnValue(() => {}),
    ...overrides,
  }
  window.hymnFileWatcher = api
  return api
}
