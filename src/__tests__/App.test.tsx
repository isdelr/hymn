import { render, screen, within } from '@testing-library/react'
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
      warnings: ['Missing manifest'],
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
      warnings: [],
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
      warnings: [],
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
    loadOrder: ['alpha-pack', 'beta-plugin'],
    notes: 'Keep this profile stable.',
  }

  const profilesState: ProfilesState = {
    activeProfileId: activeProfile.id,
    profiles: [
      activeProfile,
      {
        id: 'profile-2',
        name: 'Experimental',
        enabledMods: [],
        loadOrder: [],
      },
    ],
  }

  const scanResult: ScanResult = {
    installPath: installInfo.activePath,
    entries,
    warnings: ['Scan warning'],
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
      warnings: ['Apply warning'],
    }),
    rollbackLastApply: vi.fn().mockResolvedValue({
      snapshotId: 'snap-2',
      restoredAt: '2026-01-01T00:00:00Z',
      warnings: ['Rollback warning'],
    }),
    createPack: vi.fn().mockResolvedValue({
      success: true,
      path: 'C:\\Hytale\\packs\\TestPack',
      manifestPath: 'C:\\Hytale\\packs\\TestPack\\manifest.json',
      warnings: [],
    }),
    getBackups: vi.fn().mockResolvedValue([]),
    restoreBackup: vi.fn().mockResolvedValue({
      snapshotId: 'backup-1',
      restoredAt: '2026-01-01T00:00:00Z',
      warnings: [],
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
      warnings: [],
    }),
    openInExplorer: vi.fn().mockResolvedValue(undefined),
  }

  const merged = { ...api, ...overrides } as HymnApi
  window.hymn = merged
  return merged
}

const renderApp = async () => {
  render(<App />)
  const table = await screen.findByRole('table')
  await within(table).findByText('Alpha Pack')
  return table
}

const navigateToProfiles = async () => {
  const user = userEvent.setup()
  const profilesButton = await screen.findByRole('button', { name: /profiles/i })
  await user.click(profilesButton)
}

describe('App', () => {
  it('loads install info, scan data, and warnings', async () => {
    const fixtures = createFixtures()
    const api = buildHymnApi(fixtures)

    await renderApp()

    expect(api.getInstallInfo).toHaveBeenCalledTimes(1)
    expect(api.scanMods).toHaveBeenCalledTimes(1)

    const snapshotCard = screen.getByText('Library Snapshot').closest('[data-slot="card"]')
    expect(snapshotCard).not.toBeNull()
    const snapshotScope = within(snapshotCard as HTMLElement)

    const totalContainer = snapshotScope.getByText('Total mods').closest('div')
    expect(totalContainer).not.toBeNull()
    expect(within(totalContainer as HTMLElement).getByText('3')).toBeInTheDocument()

    const packsContainer = snapshotScope.getByText('Packs').closest('div')
    expect(packsContainer).not.toBeNull()
    expect(within(packsContainer as HTMLElement).getByText('1')).toBeInTheDocument()

    const pluginsContainer = snapshotScope.getByText('Plugins').closest('div')
    expect(pluginsContainer).not.toBeNull()
    expect(within(pluginsContainer as HTMLElement).getByText('1')).toBeInTheDocument()

    const earlyContainer = snapshotScope.getByText('Early plugins').closest('div')
    expect(earlyContainer).not.toBeNull()
    expect(within(earlyContainer as HTMLElement).getByText('1')).toBeInTheDocument()

    expect(screen.getByText('Permissions warning')).toBeInTheDocument()
    expect(screen.getByText('Scan warning')).toBeInTheDocument()
    expect(screen.getAllByText('C:\\Hytale').length).toBeGreaterThan(0)
  })

  it('filters the mod list by group or id', async () => {
    buildHymnApi(createFixtures())

    const table = await renderApp()

    const user = userEvent.setup()
    const filterInput = screen.getByPlaceholderText('Filter by name, group, or id')
    await user.type(filterInput, 'addons')

    expect(await within(table).findByText('Beta Plugin')).toBeInTheDocument()
    expect(within(table).queryByText('Alpha Pack')).not.toBeInTheDocument()
    expect(within(table).queryByText('Gamma Early')).not.toBeInTheDocument()

    await user.clear(filterInput)
    await user.type(filterInput, 'gamma-early')
    expect(await within(table).findByText('Gamma Early')).toBeInTheDocument()
    expect(within(table).queryByText('Alpha Pack')).not.toBeInTheDocument()
  })

  it('surfaces profile warnings for load order and dependencies', async () => {
    buildHymnApi(createFixtures())

    await renderApp()
    await navigateToProfiles()

    expect(await screen.findByText('Profile warnings')).toBeInTheDocument()
    expect(
      screen.getByText('Alpha Pack: Beta Plugin should load before this mod.'),
    ).toBeInTheDocument()
    expect(
      screen.getByText('Gamma Early: enabled but missing from the load order.'),
    ).toBeInTheDocument()
  })

  it('updates profile state when toggling a mod', async () => {
    const fixtures = createFixtures()
    const activeProfile = {
      ...fixtures.profilesState.profiles[0],
      enabledMods: ['alpha-pack'],
      loadOrder: ['alpha-pack'],
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
        loadOrder: [],
      }),
    )
  })

  it('reorders the load order when moving a mod', async () => {
    const fixtures = createFixtures()
    const activeProfile = {
      ...fixtures.profilesState.profiles[0],
      enabledMods: ['alpha-pack', 'beta-plugin'],
      loadOrder: ['alpha-pack', 'beta-plugin'],
    }
    fixtures.profilesState = {
      activeProfileId: activeProfile.id,
      profiles: [activeProfile],
    }

    const updateProfile = vi.fn().mockImplementation(async (profile: Profile) => profile)
    buildHymnApi(fixtures, { updateProfile })

    await renderApp()
    await navigateToProfiles()

    const user = userEvent.setup()
    const moveDown = await screen.findByLabelText('Move Alpha Pack down')
    await user.click(moveDown)

    expect(updateProfile).toHaveBeenCalledWith(
      expect.objectContaining({
        loadOrder: ['beta-plugin', 'alpha-pack'],
      }),
    )
  })

  it('applies and rolls back a profile', async () => {
    const fixtures = createFixtures()
    const applyProfile = vi.fn().mockResolvedValue({
      profileId: fixtures.profilesState.activeProfileId ?? 'profile-1',
      snapshotId: 'snap-9',
      appliedAt: '2026-01-01T00:00:00Z',
      warnings: ['Applied with warnings'],
    })
    const rollbackLastApply = vi.fn().mockResolvedValue({
      snapshotId: 'snap-8',
      restoredAt: '2026-01-01T00:00:00Z',
      warnings: ['Rollback warning'],
    })

    buildHymnApi(fixtures, { applyProfile, rollbackLastApply })

    await renderApp()
    await navigateToProfiles()

    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'Apply Profile' }))

    expect(await screen.findByText('Applied Default. Snapshot snap-9.')).toBeInTheDocument()
    expect(await screen.findByText('Applied with warnings')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Rollback' }))

    expect(await screen.findByText('Rolled back to snapshot snap-8.')).toBeInTheDocument()
    expect(await screen.findByText('Rollback warning')).toBeInTheDocument()
  })
})
