import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { createRouter, RouterProvider } from '@tanstack/react-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { routeTree } from '@/routeTree.gen'
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
      installedPath: 'C:\\Hytale\\UserData\\Packs\\TestPack',
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
  }

  const merged = { ...api, ...overrides } as HymnApi
  window.hymn = merged
  return merged
}

const createTestQueryClient = () => {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
        staleTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  })
}

const createTestRouter = () => {
  return createRouter({
    routeTree,
    defaultPreload: false,
  })
}

const renderApp = async (queryClient?: QueryClient) => {
  const client = queryClient ?? createTestQueryClient()
  const router = createTestRouter()

  render(
    <QueryClientProvider client={client}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  )

  // Wait for mods grid to appear (React Query auto-fetches)
  await screen.findByText('Alpha Pack', {}, { timeout: 5000 })
}

// Reset before each test
beforeEach(() => {
  vi.clearAllMocks()
})

describe('App', () => {
  it('loads install info and scan data', async () => {
    const fixtures = createFixtures()
    const api = buildHymnApi(fixtures)

    await renderApp()

    // React Query auto-fetches, so these should have been called
    await waitFor(() => {
      expect(api.getInstallInfo).toHaveBeenCalled()
    })

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

  it('calls setModEnabled when toggling a mod', async () => {
    const fixtures = createFixtures()
    const setModEnabled = vi.fn().mockResolvedValue({ success: true })
    const scanMods = vi.fn().mockResolvedValue(fixtures.scanResult)
    buildHymnApi(fixtures, { setModEnabled, scanMods })

    await renderApp()

    const user = userEvent.setup()
    const toggle = screen.getByRole('switch', { name: /toggle alpha pack/i })
    await user.click(toggle)

    await waitFor(() => {
      expect(setModEnabled).toHaveBeenCalledWith(
        expect.objectContaining({
          modId: 'alpha-pack',
          enabled: false,
        }),
      )
    })
  })
})
