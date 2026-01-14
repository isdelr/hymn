import { app, BrowserWindow, dialog, ipcMain, shell } from 'electron'
import { randomUUID } from 'node:crypto'
import { fileURLToPath, pathToFileURL } from 'node:url'
import fs from 'node:fs/promises'
import path from 'node:path'
import { createClient, type Client } from '@libsql/client'
import JSZip from 'jszip'
import type {
  ApplyResult,
  BackupInfo,
  BackupSnapshot,
  CreatePackOptions,
  CreatePackResult,
  ExportModpackOptions,
  ExportModpackResult,
  ImportModpackResult,
  InstallInfo,
  ModEntry,
  ModFormat,
  ModLocation,
  ModType,
  PackManifest,
  Profile,
  ProfilesState,
  RollbackResult,
  ScanResult,
} from '../src/shared/hymn-types'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

process.env.APP_ROOT = path.join(__dirname, '..')

export const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL']
export const MAIN_DIST = path.join(process.env.APP_ROOT, 'dist-electron')
export const RENDERER_DIST = path.join(process.env.APP_ROOT, 'dist')

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL ? path.join(process.env.APP_ROOT, 'public') : RENDERER_DIST

let win: BrowserWindow | null
let installPathOverride: string | null = null

const DEFAULT_INSTALL_FOLDER = 'Hytale'
const DB_FILENAME = 'hymn.sqlite'
const BACKUP_FOLDER = 'backups'
const DISABLED_FOLDER = 'disabled'
const SNAPSHOT_FILENAME = 'snapshot.json'
const SETTINGS_KEYS = {
  installPath: 'install_path_override',
  activeProfile: 'active_profile_id',
  profilesSeeded: 'profiles_seeded',
  lastSnapshot: 'last_snapshot_id',
}
const LOCATION_LABELS: Record<ModLocation, string> = {
  mods: 'Mods',
  packs: 'Packs',
  earlyplugins: 'Early plugins',
}

type DatabaseInstance = Client

let database: DatabaseInstance | null = null
let databaseInit: Promise<void> | null = null
let activeProfileId: string | null = null
let profilesSeeded = false

function createWindow() {
  win = new BrowserWindow({
    icon: path.join(process.env.VITE_PUBLIC, 'electron-vite.svg'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.mjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL)
  } else {
    win.loadFile(path.join(RENDERER_DIST, 'index.html'))
  }
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
    win = null
  }
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})

app.whenReady().then(async () => {
  await getDatabase()
  await loadPersistedSettings()
  await ensureDefaultProfile()
  registerIpcHandlers()
  createWindow()
})

function getDefaultInstallPath() {
  return path.join(app.getPath('appData'), DEFAULT_INSTALL_FOLDER)
}

async function pathExists(target: string) {
  try {
    await fs.access(target)
    return true
  } catch {
    return false
  }
}

async function ensureDir(target: string) {
  await fs.mkdir(target, { recursive: true })
}

async function copyPath(source: string, destination: string) {
  const stat = await fs.stat(source)
  if (stat.isDirectory()) {
    await ensureDir(destination)
    const entries = await fs.readdir(source, { withFileTypes: true })
    for (const entry of entries) {
      await copyPath(path.join(source, entry.name), path.join(destination, entry.name))
    }
    return
  }
  await ensureDir(path.dirname(destination))
  await fs.copyFile(source, destination)
}

async function copyPathIfExists(source: string, destination: string) {
  if (await pathExists(source)) {
    await copyPath(source, destination)
  }
}

async function removePath(target: string) {
  await fs.rm(target, { recursive: true, force: true })
}

async function movePath(source: string, destination: string) {
  try {
    await ensureDir(path.dirname(destination))
    await fs.rename(source, destination)
  } catch (error) {
    const err = error as NodeJS.ErrnoException
    if (err.code === 'EXDEV') {
      await copyPath(source, destination)
      await removePath(source)
      return
    }
    throw error
  }
}

function isWithinPath(target: string, root: string) {
  const relative = path.relative(root, target)
  return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative))
}

function getBackupsRoot() {
  return path.join(app.getPath('userData'), BACKUP_FOLDER)
}

function getDisabledRoot() {
  return path.join(app.getPath('userData'), DISABLED_FOLDER)
}

function getDisabledLocationPath(location: ModLocation) {
  return path.join(getDisabledRoot(), location)
}

function createSnapshotId() {
  return new Date().toISOString().replace(/[:.]/g, '-')
}

function getDatabasePath() {
  return path.join(app.getPath('userData'), DB_FILENAME)
}

async function initializeDatabase(db: DatabaseInstance) {
  await db.execute('PRAGMA journal_mode = WAL')
  await db.batch(
    [
      {
        sql: `
        create table if not exists app_settings (
          key text primary key,
          value text not null
        );
        `,
      },
      {
        sql: `
        create table if not exists profiles (
          id text primary key,
          name text not null,
          enabled_mods text not null,
          load_order text not null,
          notes text
        );
        `,
      },
    ],
    'write',
  )
}

function openDatabase() {
  const db = createClient({ url: pathToFileURL(getDatabasePath()).toString() })
  databaseInit = initializeDatabase(db)
  return db
}

async function getDatabase() {
  if (!database) {
    database = openDatabase()
  }
  if (databaseInit) {
    await databaseInit
  }
  return database
}

async function readSetting(key: string) {
  const db = await getDatabase()
  const result = await db.execute({
    sql: 'select value from app_settings where key = ?',
    args: [key],
  })
  const row = result.rows[0] as { value?: string } | undefined
  return typeof row?.value === 'string' ? row.value : null
}

async function writeSetting(key: string, value: string | null) {
  const db = await getDatabase()
  if (value === null) {
    await db.execute({
      sql: 'delete from app_settings where key = ?',
      args: [key],
    })
    return
  }
  await db.execute({
    sql: 'insert into app_settings (key, value) values (?, ?) on conflict(key) do update set value = excluded.value',
    args: [key, value],
  })
}

async function loadPersistedSettings() {
  installPathOverride = await readSetting(SETTINGS_KEYS.installPath)
  activeProfileId = await readSetting(SETTINGS_KEYS.activeProfile)
  profilesSeeded = (await readSetting(SETTINGS_KEYS.profilesSeeded)) === 'true'
}

function normalizeStringArray(value: string) {
  try {
    const parsed = JSON.parse(value)
    return Array.isArray(parsed) ? parsed.filter((item) => typeof item === 'string') : []
  } catch {
    return []
  }
}

function serializeStringArray(values: string[]) {
  return JSON.stringify(values)
}

function normalizeProfile(profile: Profile): Profile {
  return {
    ...profile,
    enabledMods: Array.isArray(profile.enabledMods)
      ? profile.enabledMods.filter((item) => typeof item === 'string')
      : [],
    loadOrder: Array.isArray(profile.loadOrder)
      ? profile.loadOrder.filter((item) => typeof item === 'string')
      : [],
    notes: profile.notes?.trim() || undefined,
  }
}

async function getProfilesFromDatabase() {
  const db = await getDatabase()
  const result = await db.execute(
    'select id, name, enabled_mods as enabledMods, load_order as loadOrder, notes from profiles order by name',
  )

  return result.rows.map((row) => {
    const record = row as Record<string, unknown>
    const enabledMods = typeof record.enabledMods === 'string' ? record.enabledMods : '[]'
    const loadOrder = typeof record.loadOrder === 'string' ? record.loadOrder : '[]'

    return {
      id: typeof record.id === 'string' ? record.id : '',
      name: typeof record.name === 'string' ? record.name : '',
      enabledMods: normalizeStringArray(enabledMods),
      loadOrder: normalizeStringArray(loadOrder),
      notes: typeof record.notes === 'string' ? record.notes : undefined,
    }
  })
}

async function getProfilesState(): Promise<ProfilesState> {
  const profiles = await getProfilesFromDatabase()
  if (profiles.length === 0) {
    activeProfileId = null
    await writeSetting(SETTINGS_KEYS.activeProfile, null)
    return { activeProfileId, profiles }
  }
  if (!activeProfileId || !profiles.some((profile) => profile.id === activeProfileId)) {
    activeProfileId = profiles[0].id
    await writeSetting(SETTINGS_KEYS.activeProfile, activeProfileId)
  }
  return { activeProfileId, profiles }
}

async function saveProfile(profile: Profile) {
  const db = await getDatabase()
  const normalized = normalizeProfile(profile)
  await db.execute({
    sql: `
    insert into profiles (id, name, enabled_mods, load_order, notes)
    values (?, ?, ?, ?, ?)
    on conflict(id) do update set
      name = excluded.name,
      enabled_mods = excluded.enabled_mods,
      load_order = excluded.load_order,
      notes = excluded.notes
    `,
    args: [
      normalized.id,
      normalized.name,
      serializeStringArray(normalized.enabledMods),
      serializeStringArray(normalized.loadOrder),
      normalized.notes ?? null,
    ],
  })
  return normalized
}

async function profileExists(id: string) {
  const db = await getDatabase()
  const result = await db.execute({
    sql: 'select id from profiles where id = ?',
    args: [id],
  })
  return result.rows.length > 0
}

function slugifyProfileId(name: string) {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
  return slug
}

async function createProfile(name: string): Promise<ProfilesState> {
  const trimmedName = name.trim()
  const profileName = trimmedName.length ? trimmedName : 'New Profile'
  const baseSlug = slugifyProfileId(profileName)
  const baseId = baseSlug.length ? baseSlug : `profile-${randomUUID().slice(0, 8)}`
  let id = baseId
  let suffix = 2
  while (await profileExists(id)) {
    id = `${baseId}-${suffix}`
    suffix += 1
  }
  const state = await getProfilesState()
  const baseProfile = state.profiles.find((profile) => profile.id === state.activeProfileId)
  const profile: Profile = {
    id,
    name: profileName,
    enabledMods: baseProfile ? [...baseProfile.enabledMods] : [],
    loadOrder: baseProfile ? [...baseProfile.loadOrder] : [],
    notes: baseProfile?.notes,
  }
  await saveProfile(profile)
  activeProfileId = profile.id
  await writeSetting(SETTINGS_KEYS.activeProfile, activeProfileId)
  return getProfilesState()
}

async function updateProfile(profile: Profile): Promise<Profile> {
  const normalized = await saveProfile(profile)
  return normalized
}

async function setActiveProfile(profileId: string): Promise<ProfilesState> {
  const profiles = await getProfilesFromDatabase()
  const match = profiles.find((profile) => profile.id === profileId)
  if (match) {
    activeProfileId = match.id
    await writeSetting(SETTINGS_KEYS.activeProfile, activeProfileId)
  }
  return { activeProfileId, profiles }
}

async function ensureDefaultProfile() {
  const profiles = await getProfilesFromDatabase()
  if (profiles.length > 0) {
    return
  }
  await saveProfile({
    id: 'default',
    name: 'Default',
    enabledMods: [],
    loadOrder: [],
    notes: 'Base loadout for new installs.',
  })
  activeProfileId = 'default'
  await writeSetting(SETTINGS_KEYS.activeProfile, activeProfileId)
}

async function seedProfilesFromScan(entries: ModEntry[]) {
  if (profilesSeeded || entries.length === 0) {
    return
  }
  const state = await getProfilesState()
  const activeProfile = state.profiles.find((profile) => profile.id === state.activeProfileId)
  if (!activeProfile) {
    return
  }
  if (activeProfile.enabledMods.length === 0 && activeProfile.loadOrder.length === 0) {
    const enabledMods = entries.filter((entry) => entry.enabled).map((entry) => entry.id)
    const loadOrder = entries.map((entry) => entry.id)
    await saveProfile({
      ...activeProfile,
      enabledMods,
      loadOrder,
    })
  }
  profilesSeeded = true
  await writeSetting(SETTINGS_KEYS.profilesSeeded, 'true')
}

async function resolveInstallInfo(): Promise<InstallInfo> {
  const defaultPath = getDefaultInstallPath()
  const detectedPath = (await pathExists(defaultPath)) ? defaultPath : null
  const activePath = installPathOverride ?? detectedPath
  const userDataPath = activePath ? path.join(activePath, 'UserData') : null
  const modsPath = userDataPath ? path.join(userDataPath, 'Mods') : null
  const packsPath = userDataPath ? path.join(userDataPath, 'Packs') : null
  const earlyPluginsPath = activePath ? path.join(activePath, 'earlyplugins') : null
  const issues: string[] = []

  if (activePath && !(await pathExists(activePath))) {
    issues.push('Install path does not exist.')
  }
  if (userDataPath && !(await pathExists(userDataPath))) {
    issues.push('UserData folder not found.')
  }

  return {
    defaultPath,
    detectedPath,
    activePath,
    userDataPath,
    modsPath: modsPath && (await pathExists(modsPath)) ? modsPath : null,
    packsPath: packsPath && (await pathExists(packsPath)) ? packsPath : null,
    earlyPluginsPath: earlyPluginsPath && (await pathExists(earlyPluginsPath)) ? earlyPluginsPath : null,
    issues,
  }
}

function getLocationPath(info: InstallInfo, location: ModLocation) {
  const userDataPath = info.userDataPath ?? (info.activePath ? path.join(info.activePath, 'UserData') : null)
  if (location === 'earlyplugins') {
    return info.earlyPluginsPath ?? (info.activePath ? path.join(info.activePath, 'earlyplugins') : null)
  }
  if (!userDataPath) return null
  if (location === 'mods') {
    return info.modsPath ?? path.join(userDataPath, 'Mods')
  }
  return info.packsPath ?? path.join(userDataPath, 'Packs')
}

async function readJsonFile(filePath: string) {
  const content = await fs.readFile(filePath, 'utf-8')
  return JSON.parse(content) as Record<string, unknown>
}

async function readManifestFromFolder(folderPath: string) {
  const rootManifest = path.join(folderPath, 'manifest.json')
  const serverManifest = path.join(folderPath, 'Server', 'manifest.json')

  if (await pathExists(rootManifest)) {
    return readJsonFile(rootManifest)
  }
  if (await pathExists(serverManifest)) {
    return readJsonFile(serverManifest)
  }
  return null
}

async function readManifestFromArchive(archivePath: string) {
  const data = await fs.readFile(archivePath)
  const zip = await JSZip.loadAsync(data)
  const files = Object.values(zip.files) as JSZip.JSZipObject[]
  const manifestFile =
    files.find((file) => file.name.toLowerCase() === 'manifest.json') ??
    files.find((file) => file.name.toLowerCase() === 'server/manifest.json')
  const hasClasses = files.some((file) => file.name.toLowerCase().endsWith('.class'))

  if (!manifestFile) {
    return { manifest: null, hasClasses }
  }

  const manifestRaw = await manifestFile.async('string')
  const manifest = JSON.parse(manifestRaw) as Record<string, unknown>
  return { manifest, hasClasses }
}

function resolveModType(options: {
  location: ModLocation
  manifest: Record<string, unknown> | null
  format: ModFormat
  hasClasses?: boolean
}): ModType {
  if (options.location === 'earlyplugins') {
    return 'early-plugin'
  }
  if (options.manifest && typeof options.manifest.Main === 'string') {
    return 'plugin'
  }
  if (options.hasClasses) {
    return 'plugin'
  }
  if (options.manifest) {
    return 'pack'
  }
  if (options.location === 'packs' || options.format === 'directory') {
    return 'pack'
  }
  return 'unknown'
}

function readManifestDependencies(value: unknown, label: string, warnings: string[]) {
  if (value == null) {
    return []
  }
  // Handle array format: ["mod1", "mod2"]
  if (Array.isArray(value)) {
    const values = value.filter((item) => typeof item === 'string')
    if (values.length !== value.length) {
      warnings.push(`${label} contains non-string entries.`)
    }
    return values
  }
  // Handle object format: { "mod1": ">=1.0.0", "mod2": "*" } or empty {}
  if (typeof value === 'object' && value !== null) {
    const keys = Object.keys(value as Record<string, unknown>)
    return keys
  }
  warnings.push(`${label} should be an array or object.`)
  return []
}

function createModEntry(params: {
  manifest: Record<string, unknown> | null
  fallbackName: string
  format: ModFormat
  location: ModLocation
  path: string
  hasClasses?: boolean
  enabledOverride?: boolean
  warnings?: string[]
}): ModEntry {
  const entryWarnings = [...(params.warnings ?? [])]
  const name = typeof params.manifest?.Name === 'string' ? params.manifest.Name : params.fallbackName
  const group = typeof params.manifest?.Group === 'string' ? params.manifest.Group : undefined
  const version = typeof params.manifest?.Version === 'string' ? params.manifest.Version : undefined
  const description = typeof params.manifest?.Description === 'string' ? params.manifest.Description : undefined
  let entryPoint: string | null = null
  if (params.manifest?.Main !== undefined) {
    if (typeof params.manifest.Main === 'string') {
      entryPoint = params.manifest.Main
    } else {
      entryWarnings.push('Main entry point should be a string.')
    }
  }

  const includesAssetPackValue = params.manifest?.IncludesAssetPack
  if (includesAssetPackValue !== undefined && typeof includesAssetPackValue !== 'boolean') {
    entryWarnings.push('IncludesAssetPack should be a boolean.')
  }

  const disabledByDefaultValue = params.manifest?.DisabledByDefault
  if (disabledByDefaultValue !== undefined && typeof disabledByDefaultValue !== 'boolean') {
    entryWarnings.push('DisabledByDefault should be a boolean.')
  }

  if (params.manifest && typeof params.manifest.Name !== 'string') {
    entryWarnings.push('Manifest missing Name field.')
  }

  const dependencies = readManifestDependencies(params.manifest?.Dependencies, 'Dependencies', entryWarnings)
  const optionalDependencies = readManifestDependencies(
    params.manifest?.OptionalDependencies,
    'OptionalDependencies',
    entryWarnings,
  )
  const includesAssetPack = includesAssetPackValue === true
  const enabled =
    typeof params.enabledOverride === 'boolean'
      ? params.enabledOverride
      : disabledByDefaultValue === true
        ? false
        : true
  const id = group ? `${group}:${name}` : name

  return {
    id,
    name,
    group,
    version,
    description,
    format: params.format,
    location: params.location,
    path: params.path,
    type: resolveModType({
      location: params.location,
      manifest: params.manifest,
      format: params.format,
      hasClasses: params.hasClasses,
    }),
    entryPoint,
    includesAssetPack,
    enabled,
    dependencies,
    optionalDependencies,
    warnings: entryWarnings,
  }
}

function appendEntryWarnings(entry: ModEntry, warnings: string[]) {
  for (const warning of entry.warnings) {
    warnings.push(`${entry.name}: ${warning}`)
  }
}

async function scanPacksFolder(packsPath: string, warnings: string[], enabledOverride?: boolean) {
  const entries = await fs.readdir(packsPath, { withFileTypes: true })
  const mods: ModEntry[] = []

  for (const entry of entries) {
    if (!entry.isDirectory()) continue
    const fullPath = path.join(packsPath, entry.name)
    const entryWarnings: string[] = []
    let manifest: Record<string, unknown> | null = null
    let manifestReadFailed = false

    try {
      manifest = await readManifestFromFolder(fullPath)
    } catch {
      manifestReadFailed = true
      entryWarnings.push('Failed to read manifest.json.')
    }

    if (!manifest && !manifestReadFailed) {
      entryWarnings.push('manifest.json not found.')
    }

    const modEntry = createModEntry({
      manifest,
      fallbackName: entry.name,
      format: 'directory',
      location: 'packs',
      path: fullPath,
      enabledOverride,
      warnings: entryWarnings,
    })

    appendEntryWarnings(modEntry, warnings)
    mods.push(modEntry)
  }

  return mods
}

async function scanModsFolder(modsPath: string, warnings: string[], enabledOverride?: boolean) {
  const entries = await fs.readdir(modsPath, { withFileTypes: true })
  const mods: ModEntry[] = []

  for (const entry of entries) {
    const fullPath = path.join(modsPath, entry.name)

    if (entry.isDirectory()) {
      const entryWarnings: string[] = []
      let manifest: Record<string, unknown> | null = null
      let manifestReadFailed = false

      try {
        manifest = await readManifestFromFolder(fullPath)
      } catch {
        manifestReadFailed = true
        entryWarnings.push('Failed to read manifest.json.')
      }

      if (!manifest && !manifestReadFailed) {
        entryWarnings.push('manifest.json not found.')
      }

      const modEntry = createModEntry({
        manifest,
        fallbackName: entry.name,
        format: 'directory',
        location: 'mods',
        path: fullPath,
        enabledOverride,
        warnings: entryWarnings,
      })

      appendEntryWarnings(modEntry, warnings)
      mods.push(modEntry)
      continue
    }

    const lowerName = entry.name.toLowerCase()
    if (!lowerName.endsWith('.zip') && !lowerName.endsWith('.jar')) {
      continue
    }

    const entryWarnings: string[] = []
    let manifest: Record<string, unknown> | null = null
    let hasClasses = false
    let archiveReadFailed = false

    try {
      const result = await readManifestFromArchive(fullPath)
      manifest = result.manifest
      hasClasses = result.hasClasses
    } catch {
      archiveReadFailed = true
      entryWarnings.push('Failed to read archive manifest.')
    }

    if (!manifest && !archiveReadFailed) {
      entryWarnings.push('manifest.json not found in archive.')
    }

    const format: ModFormat = lowerName.endsWith('.jar') ? 'jar' : 'zip'
    const modEntry = createModEntry({
      manifest,
      fallbackName: entry.name,
      format,
      location: 'mods',
      path: fullPath,
      hasClasses,
      enabledOverride,
      warnings: entryWarnings,
    })

    appendEntryWarnings(modEntry, warnings)
    mods.push(modEntry)
  }

  return mods
}

async function scanEarlyPluginsFolder(
  earlyPluginsPath: string,
  warnings: string[],
  enabledOverride?: boolean,
) {
  const entries = await fs.readdir(earlyPluginsPath, { withFileTypes: true })
  const mods: ModEntry[] = []

  for (const entry of entries) {
    if (!entry.isFile()) continue
    const lowerName = entry.name.toLowerCase()
    if (!lowerName.endsWith('.jar')) continue

    const fullPath = path.join(earlyPluginsPath, entry.name)
    const entryWarnings: string[] = []
    let manifest: Record<string, unknown> | null = null
    let hasClasses = false
    let archiveReadFailed = false

    try {
      const result = await readManifestFromArchive(fullPath)
      manifest = result.manifest
      hasClasses = result.hasClasses
    } catch {
      archiveReadFailed = true
      entryWarnings.push('Failed to read archive manifest.')
    }

    if (!manifest && !archiveReadFailed) {
      entryWarnings.push('manifest.json not found in archive.')
    }

    const modEntry = createModEntry({
      manifest,
      fallbackName: entry.name,
      format: 'jar',
      location: 'earlyplugins',
      path: fullPath,
      hasClasses,
      enabledOverride,
      warnings: entryWarnings,
    })

    appendEntryWarnings(modEntry, warnings)
    mods.push(modEntry)
  }

  return mods
}

async function scanMods(): Promise<ScanResult> {
  const info = await resolveInstallInfo()
  const warnings = [...info.issues]

  if (!info.activePath) {
    warnings.push('Hytale install path could not be detected.')
    return { installPath: null, entries: [], warnings }
  }

  const entries: ModEntry[] = []
  const disabledRoot = getDisabledRoot()
  const disabledPaths = {
    packs: path.join(disabledRoot, 'packs'),
    mods: path.join(disabledRoot, 'mods'),
    earlyplugins: path.join(disabledRoot, 'earlyplugins'),
  }

  if (info.packsPath) {
    entries.push(...(await scanPacksFolder(info.packsPath, warnings)))
  } else {
    warnings.push('Packs folder not found.')
  }

  if (await pathExists(disabledPaths.packs)) {
    entries.push(...(await scanPacksFolder(disabledPaths.packs, warnings, false)))
  }

  if (info.modsPath) {
    entries.push(...(await scanModsFolder(info.modsPath, warnings)))
  } else {
    warnings.push('Mods folder not found.')
  }

  if (await pathExists(disabledPaths.mods)) {
    entries.push(...(await scanModsFolder(disabledPaths.mods, warnings, false)))
  }

  if (info.earlyPluginsPath) {
    entries.push(...(await scanEarlyPluginsFolder(info.earlyPluginsPath, warnings)))
  } else {
    warnings.push('Early plugins folder not found.')
  }

  if (await pathExists(disabledPaths.earlyplugins)) {
    entries.push(...(await scanEarlyPluginsFolder(disabledPaths.earlyplugins, warnings, false)))
  }

  entries.sort((a, b) => a.name.localeCompare(b.name))

  await seedProfilesFromScan(entries)

  return { installPath: info.activePath, entries, warnings }
}

async function createBackupSnapshot(
  profileId: string,
  entries: ModEntry[],
  info: InstallInfo,
): Promise<BackupSnapshot> {
  const createdAt = new Date().toISOString()
  const id = createSnapshotId()
  const backupsRoot = getBackupsRoot()
  const snapshotRoot = path.join(backupsRoot, id)
  const modsPath = getLocationPath(info, 'mods')
  const packsPath = getLocationPath(info, 'packs')
  const earlyPluginsPath = getLocationPath(info, 'earlyplugins')

  await ensureDir(snapshotRoot)

  if (modsPath) {
    await copyPathIfExists(modsPath, path.join(snapshotRoot, 'mods'))
  }
  if (packsPath) {
    await copyPathIfExists(packsPath, path.join(snapshotRoot, 'packs'))
  }
  if (earlyPluginsPath) {
    await copyPathIfExists(earlyPluginsPath, path.join(snapshotRoot, 'earlyplugins'))
  }

  const disabledRoot = getDisabledRoot()
  if (await pathExists(disabledRoot)) {
    await copyPath(disabledRoot, path.join(snapshotRoot, 'disabled'))
  }

  const snapshot: BackupSnapshot = {
    id,
    createdAt,
    profileId,
    location: snapshotRoot,
    mods: entries.map((entry) => entry.id),
  }

  await fs.writeFile(path.join(snapshotRoot, SNAPSHOT_FILENAME), JSON.stringify(snapshot, null, 2), 'utf-8')

  return snapshot
}

async function readBackupSnapshot(snapshotId: string): Promise<BackupSnapshot | null> {
  const snapshotPath = path.join(getBackupsRoot(), snapshotId, SNAPSHOT_FILENAME)
  if (!(await pathExists(snapshotPath))) {
    return null
  }
  const content = await fs.readFile(snapshotPath, 'utf-8')
  return JSON.parse(content) as BackupSnapshot
}

async function restoreSnapshotFolder(
  snapshotPath: string,
  destination: string | null,
  label: string,
  warnings: string[],
) {
  if (!destination) {
    warnings.push(`${label} path unavailable.`)
    return
  }
  await removePath(destination)
  if (await pathExists(snapshotPath)) {
    await copyPath(snapshotPath, destination)
    return
  }
  await ensureDir(destination)
  warnings.push(`${label} snapshot missing; created empty folder.`)
}

async function applyProfile(profileId: string): Promise<ApplyResult> {
  const info = await resolveInstallInfo()
  if (!info.activePath) {
    throw new Error('Hytale install path not configured.')
  }

  const profiles = await getProfilesFromDatabase()
  const profile = profiles.find((entry) => entry.id === profileId)
  if (!profile) {
    throw new Error('Profile not found.')
  }

  const scan = await scanMods()
  const snapshot = await createBackupSnapshot(profile.id, scan.entries, info)
  const warnings: string[] = []
  const enabledSet = new Set(profile.enabledMods)
  const entryIds = new Set(scan.entries.map((entry) => entry.id))

  for (const id of enabledSet) {
    if (!entryIds.has(id)) {
      warnings.push(`Profile expects ${id} but it was not found in the library.`)
    }
  }

  const disabledRoot = getDisabledRoot()

  for (const entry of scan.entries) {
    const shouldEnable = enabledSet.has(entry.id)
    const currentlyDisabled = isWithinPath(entry.path, disabledRoot)

    if (shouldEnable && currentlyDisabled) {
      const targetRoot = getLocationPath(info, entry.location)
      if (!targetRoot) {
        warnings.push(`${entry.name}: ${LOCATION_LABELS[entry.location]} folder missing.`)
        continue
      }
      await ensureDir(targetRoot)
      const targetPath = path.join(targetRoot, path.basename(entry.path))
      if (await pathExists(targetPath)) {
        warnings.push(`${entry.name}: already exists in ${LOCATION_LABELS[entry.location]}.`)
        continue
      }
      await movePath(entry.path, targetPath)
      continue
    }

    if (!shouldEnable && !currentlyDisabled) {
      const disabledLocation = getDisabledLocationPath(entry.location)
      await ensureDir(disabledLocation)
      const targetPath = path.join(disabledLocation, path.basename(entry.path))
      if (await pathExists(targetPath)) {
        warnings.push(`${entry.name}: already disabled in ${LOCATION_LABELS[entry.location]}.`)
        continue
      }
      await movePath(entry.path, targetPath)
    }
  }

  await writeSetting(SETTINGS_KEYS.lastSnapshot, snapshot.id)

  return {
    profileId: profile.id,
    snapshotId: snapshot.id,
    appliedAt: snapshot.createdAt,
    warnings,
  }
}

async function rollbackLastApply(): Promise<RollbackResult> {
  const snapshotId = await readSetting(SETTINGS_KEYS.lastSnapshot)
  if (!snapshotId) {
    throw new Error('No backup snapshot available.')
  }

  const snapshot = await readBackupSnapshot(snapshotId)
  if (!snapshot) {
    throw new Error('Backup snapshot not found.')
  }

  const snapshotRoot = snapshot.location
  if (!(await pathExists(snapshotRoot))) {
    throw new Error('Backup snapshot not found.')
  }

  const info = await resolveInstallInfo()
  if (!info.activePath) {
    throw new Error('Hytale install path not configured.')
  }

  const scan = await scanMods()
  await createBackupSnapshot(`pre-rollback-${snapshotId}`, scan.entries, info)

  const warnings: string[] = []

  await restoreSnapshotFolder(path.join(snapshotRoot, 'mods'), getLocationPath(info, 'mods'), LOCATION_LABELS.mods, warnings)
  await restoreSnapshotFolder(
    path.join(snapshotRoot, 'packs'),
    getLocationPath(info, 'packs'),
    LOCATION_LABELS.packs,
    warnings,
  )
  await restoreSnapshotFolder(
    path.join(snapshotRoot, 'earlyplugins'),
    getLocationPath(info, 'earlyplugins'),
    LOCATION_LABELS.earlyplugins,
    warnings,
  )
  await restoreSnapshotFolder(path.join(snapshotRoot, 'disabled'), getDisabledRoot(), 'Disabled mods', warnings)

  return {
    snapshotId,
    restoredAt: new Date().toISOString(),
    warnings,
  }
}

async function createPack(options: CreatePackOptions): Promise<CreatePackResult> {
  const info = await resolveInstallInfo()
  if (!info.activePath) {
    throw new Error('Hytale install path not configured.')
  }

  const warnings: string[] = []
  const packName = options.name.trim() || 'NewPack'
  const safeName = packName.replace(/[^a-zA-Z0-9_-]/g, '_')

  const targetRoot = options.location === 'packs'
    ? info.packsPath ?? path.join(info.activePath, 'UserData', 'Packs')
    : info.modsPath ?? path.join(info.activePath, 'UserData', 'Mods')

  await ensureDir(targetRoot)

  const packPath = path.join(targetRoot, safeName)
  if (await pathExists(packPath)) {
    throw new Error(`A pack named "${safeName}" already exists.`)
  }

  await ensureDir(packPath)

  if (options.includeCommon !== false) {
    await ensureDir(path.join(packPath, 'Common'))
    await ensureDir(path.join(packPath, 'Common', 'BlockTextures'))
    await ensureDir(path.join(packPath, 'Common', 'Models'))
  }

  if (options.includeServer !== false) {
    await ensureDir(path.join(packPath, 'Server'))
    await ensureDir(path.join(packPath, 'Server', 'Item'))
    await ensureDir(path.join(packPath, 'Server', 'Item', 'Items'))
    await ensureDir(path.join(packPath, 'Server', 'Languages'))
    await ensureDir(path.join(packPath, 'Server', 'Languages', 'en-US'))
  }

  const manifest: PackManifest = {
    Name: packName,
  }

  if (options.group?.trim()) {
    manifest.Group = options.group.trim()
  }

  manifest.Version = options.version?.trim() || '1.0.0'

  if (options.description?.trim()) {
    manifest.Description = options.description.trim()
  }

  if (options.authorName?.trim()) {
    const author: { Name: string; Email?: string } = { Name: options.authorName.trim() }
    if (options.authorEmail?.trim()) {
      author.Email = options.authorEmail.trim()
    }
    manifest.Authors = [author]
  }

  const manifestPath = path.join(packPath, 'manifest.json')
  await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2), 'utf-8')

  if (options.includeServer !== false) {
    const langContent = `${safeName}.name = ${packName}\n`
    await fs.writeFile(
      path.join(packPath, 'Server', 'Languages', 'en-US', 'server.lang'),
      langContent,
      'utf-8',
    )
  }

  return {
    success: true,
    path: packPath,
    manifestPath,
    warnings,
  }
}

async function getBackups(): Promise<BackupInfo[]> {
  const backupsRoot = getBackupsRoot()
  if (!(await pathExists(backupsRoot))) {
    return []
  }

  const entries = await fs.readdir(backupsRoot, { withFileTypes: true })
  const backups: BackupInfo[] = []

  for (const entry of entries) {
    if (!entry.isDirectory()) continue

    const snapshotPath = path.join(backupsRoot, entry.name, SNAPSHOT_FILENAME)
    if (!(await pathExists(snapshotPath))) continue

    try {
      const content = await fs.readFile(snapshotPath, 'utf-8')
      const snapshot = JSON.parse(content) as BackupSnapshot
      backups.push({
        id: snapshot.id,
        createdAt: snapshot.createdAt,
        profileId: snapshot.profileId,
        modCount: snapshot.mods?.length ?? 0,
      })
    } catch {
      continue
    }
  }

  return backups.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

async function restoreBackup(backupId: string): Promise<RollbackResult> {
  const snapshot = await readBackupSnapshot(backupId)
  if (!snapshot) {
    throw new Error('Backup snapshot not found.')
  }

  const snapshotRoot = snapshot.location
  if (!(await pathExists(snapshotRoot))) {
    throw new Error('Backup snapshot files not found.')
  }

  const info = await resolveInstallInfo()
  if (!info.activePath) {
    throw new Error('Hytale install path not configured.')
  }

  const scan = await scanMods()
  await createBackupSnapshot(`pre-restore-${backupId}`, scan.entries, info)

  const warnings: string[] = []

  await restoreSnapshotFolder(path.join(snapshotRoot, 'mods'), getLocationPath(info, 'mods'), LOCATION_LABELS.mods, warnings)
  await restoreSnapshotFolder(path.join(snapshotRoot, 'packs'), getLocationPath(info, 'packs'), LOCATION_LABELS.packs, warnings)
  await restoreSnapshotFolder(path.join(snapshotRoot, 'earlyplugins'), getLocationPath(info, 'earlyplugins'), LOCATION_LABELS.earlyplugins, warnings)
  await restoreSnapshotFolder(path.join(snapshotRoot, 'disabled'), getDisabledRoot(), 'Disabled mods', warnings)

  return {
    snapshotId: backupId,
    restoredAt: new Date().toISOString(),
    warnings,
  }
}

async function deleteBackup(backupId: string): Promise<{ success: boolean }> {
  const backupPath = path.join(getBackupsRoot(), backupId)
  if (!(await pathExists(backupPath))) {
    throw new Error('Backup not found.')
  }

  await removePath(backupPath)
  return { success: true }
}

async function exportModpack(options: ExportModpackOptions): Promise<ExportModpackResult> {
  const profiles = await getProfilesFromDatabase()
  const profile = profiles.find((p) => p.id === options.profileId)
  if (!profile) {
    throw new Error('Profile not found.')
  }

  const scan = await scanMods()
  const enabledMods = scan.entries.filter((entry) => profile.enabledMods.includes(entry.id))

  const zip = new JSZip()

  const modpackMeta = {
    name: profile.name,
    profileId: profile.id,
    enabledMods: profile.enabledMods,
    loadOrder: profile.loadOrder,
    notes: profile.notes,
    exportedAt: new Date().toISOString(),
    modCount: enabledMods.length,
  }

  zip.file('modpack.json', JSON.stringify(modpackMeta, null, 2))

  let outputPath = options.outputPath
  if (!outputPath) {
    const result = await dialog.showSaveDialog({
      title: 'Export Modpack',
      defaultPath: `${profile.name.replace(/[^a-zA-Z0-9_-]/g, '_')}.hymnpack`,
      filters: [{ name: 'Hymn Modpack', extensions: ['hymnpack'] }],
    })

    if (result.canceled || !result.filePath) {
      throw new Error('Export cancelled.')
    }
    outputPath = result.filePath
  }

  const zipContent = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' })
  await fs.writeFile(outputPath, zipContent)

  return {
    success: true,
    outputPath,
    modCount: enabledMods.length,
  }
}

async function importModpack(): Promise<ImportModpackResult> {
  const result = await dialog.showOpenDialog({
    title: 'Import Modpack',
    filters: [{ name: 'Hymn Modpack', extensions: ['hymnpack'] }],
    properties: ['openFile'],
  })

  if (result.canceled || result.filePaths.length === 0) {
    throw new Error('Import cancelled.')
  }

  const filePath = result.filePaths[0]
  const data = await fs.readFile(filePath)
  const zip = await JSZip.loadAsync(data)

  const modpackFile = zip.file('modpack.json')
  if (!modpackFile) {
    throw new Error('Invalid modpack: missing modpack.json')
  }

  const modpackContent = await modpackFile.async('string')
  const modpackMeta = JSON.parse(modpackContent) as {
    name: string
    enabledMods: string[]
    loadOrder: string[]
    notes?: string
  }

  const warnings: string[] = []

  const state = await createProfile(modpackMeta.name || 'Imported Profile')
  const newProfile = state.profiles.find((p) => p.id === state.activeProfileId)
  if (!newProfile) {
    throw new Error('Failed to create profile.')
  }

  const scan = await scanMods()
  const knownModIds = new Set(scan.entries.map((e) => e.id))

  const validEnabledMods = modpackMeta.enabledMods.filter((id) => {
    if (!knownModIds.has(id)) {
      warnings.push(`Mod "${id}" not found in library.`)
      return false
    }
    return true
  })

  const validLoadOrder = modpackMeta.loadOrder.filter((id) => knownModIds.has(id))

  await updateProfile({
    ...newProfile,
    enabledMods: validEnabledMods,
    loadOrder: validLoadOrder,
    notes: modpackMeta.notes,
  })

  return {
    success: true,
    profileId: newProfile.id,
    modCount: validEnabledMods.length,
    warnings,
  }
}

function registerIpcHandlers() {
  ipcMain.handle('hymn:get-install-info', async () => resolveInstallInfo())

  ipcMain.handle('hymn:select-install-path', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory'],
      title: 'Select Hytale Install Folder',
    })

    if (result.canceled || result.filePaths.length === 0) {
      return resolveInstallInfo()
    }

    installPathOverride = result.filePaths[0]
    await writeSetting(SETTINGS_KEYS.installPath, installPathOverride)
    return resolveInstallInfo()
  })

  ipcMain.handle('hymn:scan-mods', async () => scanMods())
  ipcMain.handle('hymn:get-profiles', async () => getProfilesState())
  ipcMain.handle('hymn:create-profile', async (_event, name: string) => createProfile(name ?? ''))
  ipcMain.handle('hymn:update-profile', async (_event, profile: Profile) => updateProfile(profile))
  ipcMain.handle('hymn:set-active-profile', async (_event, profileId: string) => setActiveProfile(profileId))
  ipcMain.handle('hymn:apply-profile', async (_event, profileId: string) => applyProfile(profileId))
  ipcMain.handle('hymn:rollback-last-apply', async () => rollbackLastApply())
  ipcMain.handle('hymn:create-pack', async (_event, options: CreatePackOptions) => createPack(options))
  ipcMain.handle('hymn:get-backups', async () => getBackups())
  ipcMain.handle('hymn:restore-backup', async (_event, backupId: string) => restoreBackup(backupId))
  ipcMain.handle('hymn:delete-backup', async (_event, backupId: string) => deleteBackup(backupId))
  ipcMain.handle('hymn:export-modpack', async (_event, options: ExportModpackOptions) => exportModpack(options))
  ipcMain.handle('hymn:import-modpack', async () => importModpack())
  ipcMain.handle('hymn:open-in-explorer', async (_event, targetPath: string) => {
    await shell.openPath(targetPath)
  })
}
