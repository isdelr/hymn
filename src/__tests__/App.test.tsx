import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import App from '@/App'
import type {
  HymnApi,
  InstallInfo,
  ModEntry,
  Profile,
  ProfilesState,
  ScanResult,
} from '@/shared/hymn-types'

declare global {
  interface Window {
    hymn: HymnApi
  }
}

type Fixtures = {
  entries: ModEntry[]
  installInfo: InstallInfo
  profilesState: ProfilesState
  scanResult: ScanResult
}

const createFixtures = (): Fixtures => {
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
    packsPath: 'C:\\Hytale\\packs',
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

const buildHymnApi = (fixtures: Fixtures, overrides: Partial<HymnApi> = {}): HymnApi => {
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
      snapshotId: 'snap-1',
      appliedAt: '2026-01-01T00:00:00Z',
    }),
    rollbackLastApply: vi.fn().mockResolvedValue({
      snapshotId: 'snap-2',
      restoredAt: '2026-01-01T00:00:00Z',
    }),
    createPack: vi.fn().mockResolvedValue({
      success: true,
      path: 'C:\\Hytale\\packs\\TestPack',
      manifestPath: 'C:\\Hytale\\packs\\TestPack\\manifest.json',
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
    getBackups: vi.fn().mockResolvedValue([]),
    restoreBackup: vi.fn().mockResolvedValue({
      snapshotId: 'backup-1',
      restoredAt: '2026-01-01T00:00:00Z',
    }),
    deleteBackup: vi.fn().mockResolvedValue({ success: true }),
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
    openInExplorer: vi.fn().mockResolvedValue(undefined),
    // World management methods
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
    // Mod management methods
    deleteMod: vi.fn().mockResolvedValue({
      success: true,
      backupPath: 'C:\\Users\\test\\AppData\\hymn\\deleted-mods\\TestMod_2026-01-01',
    }),
    addMods: vi.fn().mockResolvedValue({
      success: true,
      addedPaths: ['C:\\Hytale\\UserData\\Mods\\TestMod.zip'],
    }),
  }

  const merged = { ...api, ...overrides } as HymnApi
  window.hymn = merged
  return merged
}

const renderApp = async () => {
  render(<App />)
  // Wait for mods grid to appear
  await screen.findByText('Alpha Pack')
}

describe('App', () => {
  it('loads install info and scan data', async () => {
    const fixtures = createFixtures()
    const api = buildHymnApi(fixtures)

    await renderApp()

    expect(api.getInstallInfo).toHaveBeenCalledTimes(1)
    expect(api.scanMods).toHaveBeenCalledTimes(1)

    // Check mod cards are rendered
    expect(screen.getByText('Alpha Pack')).toBeInTheDocument()
    expect(screen.getByText('Beta Plugin')).toBeInTheDocument()
    expect(screen.getByText('Gamma Early')).toBeInTheDocument()
  })

  it('filters the mod list by group or id', async () => {
    buildHymnApi(createFixtures())

    await renderApp()

    const user = userEvent.setup()
    const filterInput = screen.getByPlaceholderText(/search mods/i)
    await user.type(filterInput, 'addons')

    expect(await screen.findByText('Beta Plugin')).toBeInTheDocument()
    expect(screen.queryByText('Alpha Pack')).not.toBeInTheDocument()
    expect(screen.queryByText('Gamma Early')).not.toBeInTheDocument()

    await user.clear(filterInput)
    await user.type(filterInput, 'gamma-early')
    expect(await screen.findByText('Gamma Early')).toBeInTheDocument()
    expect(screen.queryByText('Alpha Pack')).not.toBeInTheDocument()
  })

  it('updates profile state when toggling a mod', async () => {
    const fixtures = createFixtures()
    const activeProfile = {
      ...fixtures.profilesState.profiles[0],
      enabledMods: ['alpha-pack'],
    }
    fixtures.profilesState = {
      activeProfileId: activeProfile.id,
      profiles: [activeProfile],
    }

    const updateProfile = vi.fn().mockImplementation(async (profile: Profile) => profile)
    buildHymnApi(fixtures, { updateProfile })

    await renderApp()

    const user = userEvent.setup()
    const toggle = screen.getByRole('switch', { name: /toggle alpha pack/i })
    await user.click(toggle)

    expect(updateProfile).toHaveBeenCalledWith(
      expect.objectContaining({
        enabledMods: [],
      }),
    )
  })
})
