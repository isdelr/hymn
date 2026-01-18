import { app, BrowserWindow, dialog, ipcMain, shell } from 'electron'
import { spawn } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { createWriteStream } from 'node:fs'
import type { Dirent } from 'node:fs'
import fs from 'node:fs/promises'
import fsSync from 'node:fs'
import path from 'node:path'
import { pipeline } from 'node:stream/promises'
import { createClient, type Client } from '@libsql/client'
import JSZip from 'jszip'
import * as yauzl from 'yauzl'
import type {
  ApplyResult,
  BackupInfo,
  BackupSnapshot,
  CreatePackOptions,
  CreatePackResult,
  CreatePluginOptions,
  CreatePluginResult,
  ExportModpackOptions,
  ExportModpackResult,
  ImportModpackResult,
  InstallInfo,
  ModAsset,
  ModAssetKind,
  ModAssetsOptions,
  ModAssetsResult,
  ModBuildOptions,
  ModBuildResult,
  ModEntry,
  ModFormat,
  ModLocation,
  ModManifestOptions,
  ModManifestResult,
  ModType,
  PackManifest,
  Profile,
  ProfilesState,
  RollbackResult,
  SaveManifestOptions,
  SaveManifestResult,
  ScanResult,
  CreateServerAssetOptions,
  DeleteServerAssetOptions,
  DeleteServerAssetResult,
  DuplicateServerAssetOptions,
  ImportVanillaAssetOptions,
  ImportVanillaAssetResult,
  MoveServerAssetOptions,
  ServerAsset,
  ServerAssetKind,
  ServerAssetListOptions,
  ServerAssetListResult,
  ServerAssetMutationResult,
  ServerAssetTemplate,
  VanillaAssetEntry,
  VanillaAssetListOptions,
  VanillaAssetListResult,
  // World management types
  WorldInfo,
  WorldConfig,
  WorldsState,
  SetModEnabledOptions,
  SetModEnabledResult,
  DeleteModOptions,
  DeleteModResult,
  AddModResult,
  FileNode,
  ListProjectFilesOptions,
  ListProjectFilesResult,
  // Java source file types
  JavaClassTemplate,
  CreateJavaClassOptions,
  CreateJavaClassResult,
  JavaSourceFile,
  ListJavaSourcesOptions,
  ListJavaSourcesResult,
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
  selectedWorld: 'selected_world_id',
}
const DELETED_MODS_FOLDER = 'deleted-mods'


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

async function getPathSize(target: string): Promise<number | undefined> {
  try {
    const stat = await fs.stat(target)
    if (stat.isFile()) {
      return stat.size
    }
    if (stat.isDirectory()) {
      let total = 0
      const entries = await fs.readdir(target, { withFileTypes: true })
      for (const entry of entries) {
        const entrySize = await getPathSize(path.join(target, entry.name))
        if (entrySize !== undefined) {
          total += entrySize
        }
      }
      return total
    }
    return undefined
  } catch {
    return undefined
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
          notes text,
          readonly integer default 0
        );
        `,
      },
    ],
    'write',
  )

  // Migration: add readonly column if it doesn't exist
  try {
    await db.execute('ALTER TABLE profiles ADD COLUMN readonly integer default 0')
  } catch {
    // Column already exists, ignore error
  }
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
    readonly: profile.readonly === true,
  }
}

async function getProfilesFromDatabase() {
  const db = await getDatabase()
  const result = await db.execute(
    'select id, name, enabled_mods as enabledMods, readonly from profiles order by readonly desc, name',
  )

  return result.rows.map((row) => {
    const record = row as Record<string, unknown>
    const enabledMods = typeof record.enabledMods === 'string' ? record.enabledMods : '[]'

    return {
      id: typeof record.id === 'string' ? record.id : '',
      name: typeof record.name === 'string' ? record.name : '',
      enabledMods: normalizeStringArray(enabledMods),
      readonly: record.readonly === 1,
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
    insert into profiles (id, name, enabled_mods, load_order, readonly)
    values (?, ?, ?, ?, ?)
    on conflict(id) do update set
      name = excluded.name,
      enabled_mods = excluded.enabled_mods,
      load_order = excluded.load_order,
      readonly = excluded.readonly
    `,
    args: [
      normalized.id,
      normalized.name,
      serializeStringArray(normalized.enabledMods),
      '[]',
      normalized.readonly ? 1 : 0,
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
  const profile: Profile = {
    id,
    name: profileName,
    enabledMods: [],
    readonly: false,
  }
  await saveProfile(profile)
  activeProfileId = profile.id
  await writeSetting(SETTINGS_KEYS.activeProfile, activeProfileId)
  return getProfilesState()
}

async function updateProfile(profile: Profile): Promise<Profile> {
  // Prevent modifications to readonly profiles
  const existing = (await getProfilesFromDatabase()).find((p) => p.id === profile.id)
  if (existing?.readonly) {
    throw new Error('Cannot modify readonly profile')
  }
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
  // Don't create default profile here - it will be created when scanning
  // with the actual mod state from the folders
}

async function seedProfilesFromScan(entries: ModEntry[]) {
  if (profilesSeeded) {
    return
  }

  const profiles = await getProfilesFromDatabase()
  const hasDefaultProfile = profiles.some((p) => p.id === 'default' && p.readonly)

  if (!hasDefaultProfile) {
    // Create readonly Default profile with current mod state
    const enabledMods = entries.filter((entry) => entry.enabled).map((entry) => entry.id)
    await saveProfile({
      id: 'default',
      name: 'Default',
      enabledMods,
      readonly: true,
    })
    activeProfileId = 'default'
    await writeSetting(SETTINGS_KEYS.activeProfile, activeProfileId)
  }

  profilesSeeded = true
  await writeSetting(SETTINGS_KEYS.profilesSeeded, 'true')
}

async function syncDefaultProfileFromScan(entries: ModEntry[]) {
  const profiles = await getProfilesFromDatabase()
  const defaultProfile = profiles.find((profile) => profile.id === 'default' && profile.readonly)
  if (!defaultProfile) return

  const enabledMods = entries.filter((entry) => entry.enabled).map((entry) => entry.id)
  const uniqueEnabled = Array.from(new Set(enabledMods))
  const current = defaultProfile.enabledMods
  const hasChanges =
    uniqueEnabled.length !== current.length || uniqueEnabled.some((id) => !current.includes(id))

  if (!hasChanges) return

  await saveProfile({
    ...defaultProfile,
    enabledMods: uniqueEnabled,
    readonly: true,
  })
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

async function getWorldConfigPaths(userDataPath: string | null) {
  if (!userDataPath) return []
  const savesRoot = path.join(userDataPath, 'Saves')
  if (!(await pathExists(savesRoot))) {
    return []
  }
  const entries = await fs.readdir(savesRoot, { withFileTypes: true })
  const configs: string[] = []

  for (const entry of entries) {
    if (!entry.isDirectory()) continue
    const configPath = path.join(savesRoot, entry.name, 'config.json')
    if (await pathExists(configPath)) {
      configs.push(configPath)
    }
  }

  return configs
}

async function getActiveWorldConfigPath(userDataPath: string | null) {
  const configs = await getWorldConfigPaths(userDataPath)
  let latest: { path: string; mtimeMs: number } | null = null

  for (const configPath of configs) {
    const stat = await fs.stat(configPath)
    if (!latest || stat.mtimeMs > latest.mtimeMs) {
      latest = { path: configPath, mtimeMs: stat.mtimeMs }
    }
  }

  return latest?.path ?? null
}

function readWorldModOverridesFromConfig(config: Record<string, unknown>) {
  const overrides = new Map<string, boolean>()
  const modsValue = config.Mods
  if (!modsValue || typeof modsValue !== 'object') {
    return overrides
  }

  for (const [modId, value] of Object.entries(modsValue as Record<string, unknown>)) {
    if (!value || typeof value !== 'object') continue
    const enabledValue = (value as Record<string, unknown>).Enabled
    if (typeof enabledValue === 'boolean') {
      overrides.set(modId, enabledValue)
    }
  }

  return overrides
}

async function readActiveWorldModOverrides(userDataPath: string | null) {
  const configPath = await getActiveWorldConfigPath(userDataPath)
  if (!configPath) return null
  try {
    const config = await readJsonFile(configPath)
    return readWorldModOverridesFromConfig(config)
  } catch {
    return null
  }
}

async function updateWorldModConfig(configPath: string, enabledSet: Set<string>, entries: ModEntry[]) {
  let config: Record<string, unknown> = {}
  try {
    config = await readJsonFile(configPath)
  } catch {
    config = {}
  }

  const existingMods = config.Mods
  const modsSection: Record<string, unknown> =
    existingMods && typeof existingMods === 'object' ? { ...(existingMods as Record<string, unknown>) } : {}

  for (const entry of entries) {
    const existingEntry = modsSection[entry.id]
    const nextEntry: Record<string, unknown> =
      existingEntry && typeof existingEntry === 'object' ? { ...(existingEntry as Record<string, unknown>) } : {}
    nextEntry.Enabled = enabledSet.has(entry.id)
    modsSection[entry.id] = nextEntry
  }

  config.Mods = modsSection
  await fs.writeFile(configPath, JSON.stringify(config, null, 2), 'utf-8')
}

async function syncActiveWorldModConfig(
  userDataPath: string | null,
  enabledSet: Set<string>,
  entries: ModEntry[],
) {
  const configPath = await getActiveWorldConfigPath(userDataPath)
  if (!configPath) return
  try {
    await updateWorldModConfig(configPath, enabledSet, entries)
  } catch {
    // Failed to sync mod settings
  }
}

// ============================================================================
// WORLD MANAGEMENT FUNCTIONS
// ============================================================================

function getDeletedModsRoot() {
  return path.join(app.getPath('userData'), DELETED_MODS_FOLDER)
}

async function getWorlds(): Promise<WorldsState> {
  const info = await resolveInstallInfo()
  if (!info.userDataPath) {
    return { worlds: [], selectedWorldId: null }
  }

  const savesPath = path.join(info.userDataPath, 'Saves')
  if (!(await pathExists(savesPath))) {
    return { worlds: [], selectedWorldId: null }
  }

  const entries = await fs.readdir(savesPath, { withFileTypes: true })
  const worlds: WorldInfo[] = []

  for (const entry of entries) {
    if (!entry.isDirectory()) continue
    const worldPath = path.join(savesPath, entry.name)
    const configPath = path.join(worldPath, 'config.json')
    const previewPath = path.join(worldPath, 'preview.png')

    if (!(await pathExists(configPath))) continue // Only include valid worlds

    const stat = await fs.stat(worldPath)
    let previewDataUrl: string | null = null

    if (await pathExists(previewPath)) {
      try {
        const previewBuffer = await fs.readFile(previewPath)
        previewDataUrl = `data:image/png;base64,${previewBuffer.toString('base64')}`
      } catch {
        // Ignore preview read errors
      }
    }

    worlds.push({
      id: entry.name,
      name: entry.name,
      path: worldPath,
      configPath,
      previewPath: (await pathExists(previewPath)) ? previewPath : null,
      previewDataUrl,
      lastModified: stat.mtime.toISOString(),
    })
  }

  // Sort by last modified (most recent first)
  worlds.sort((a, b) => b.lastModified.localeCompare(a.lastModified))

  // Get persisted selected world or default to most recent
  const selectedWorldId = (await readSetting(SETTINGS_KEYS.selectedWorld)) ?? (worlds.length > 0 ? worlds[0].id : null)

  return { worlds, selectedWorldId }
}

async function getWorldConfig(worldId: string): Promise<WorldConfig | null> {
  const info = await resolveInstallInfo()
  if (!info.userDataPath) return null

  const configPath = path.join(info.userDataPath, 'Saves', worldId, 'config.json')

  // Safety: Verify path is within expected location
  const savesRoot = path.join(info.userDataPath, 'Saves')
  if (!isWithinPath(configPath, savesRoot)) {
    throw new Error('Invalid world path detected.')
  }

  if (!(await pathExists(configPath))) return null

  try {
    const content = await fs.readFile(configPath, 'utf-8')
    return JSON.parse(content) as WorldConfig
  } catch {
    return null
  }
}

async function setModEnabled(options: SetModEnabledOptions): Promise<SetModEnabledResult> {
  const info = await resolveInstallInfo()

  if (!info.userDataPath) {
    throw new Error('Hytale UserData path not found.')
  }

  const configPath = path.join(info.userDataPath, 'Saves', options.worldId, 'config.json')

  // Safety: Verify path is within expected location
  const savesRoot = path.join(info.userDataPath, 'Saves')
  if (!isWithinPath(configPath, savesRoot)) {
    throw new Error('Invalid world path detected.')
  }

  if (!(await pathExists(configPath))) {
    throw new Error('World config.json not found.')
  }

  let config: WorldConfig = {}
  try {
    const content = await fs.readFile(configPath, 'utf-8')
    config = JSON.parse(content) as WorldConfig
  } catch {
    // Could not read existing config, creating new Mods section
  }

  // Initialize Mods section if needed
  if (!config.Mods || typeof config.Mods !== 'object') {
    config.Mods = {}
  }

  // Initialize mod entry if needed
  if (!config.Mods[options.modId] || typeof config.Mods[options.modId] !== 'object') {
    config.Mods[options.modId] = { Enabled: options.enabled }
  } else {
    config.Mods[options.modId].Enabled = options.enabled
  }

  // Write back to file
  await fs.writeFile(configPath, JSON.stringify(config, null, 2), 'utf-8')

  return { success: true }
}

async function setSelectedWorld(worldId: string): Promise<void> {
  await writeSetting(SETTINGS_KEYS.selectedWorld, worldId)
}

async function deleteMod(options: DeleteModOptions): Promise<DeleteModResult> {
  const info = await resolveInstallInfo()

  if (!info.activePath) {
    throw new Error('Hytale install path not configured.')
  }

  // Safety: Verify mod path is within allowed locations
  const allowedRoots = [info.modsPath, info.packsPath, info.earlyPluginsPath, getDisabledRoot()].filter(
    Boolean,
  ) as string[]

  const isWithinAllowed = allowedRoots.some((root) => isWithinPath(options.modPath, root))
  if (!isWithinAllowed) {
    throw new Error('Cannot delete mod: path is outside allowed mod folders.')
  }

  // Verify file/folder exists
  if (!(await pathExists(options.modPath))) {
    throw new Error('Mod not found at specified path.')
  }

  // Create backup before deletion
  const backupRoot = getDeletedModsRoot()
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
  const backupPath = path.join(backupRoot, `${path.basename(options.modPath)}_${timestamp}`)

  await ensureDir(backupRoot)
  await copyPath(options.modPath, backupPath)

  // Delete the mod
  await removePath(options.modPath)

  return { success: true, backupPath }
}

async function addMods(): Promise<AddModResult> {
  const info = await resolveInstallInfo()

  if (!info.modsPath) {
    throw new Error('Mods folder not found.')
  }

  // Open file dialog for mod selection
  const result = await dialog.showOpenDialog({
    title: 'Add Mods',
    properties: ['openFile', 'multiSelections'],
    filters: [
      { name: 'Mod Files', extensions: ['zip', 'jar'] },
      { name: 'All Files', extensions: ['*'] },
    ],
  })

  if (result.canceled || result.filePaths.length === 0) {
    throw new Error('Import cancelled.')
  }

  const skippedMods: string[] = []
  const addedPaths: string[] = []

  await ensureDir(info.modsPath)

  for (const sourcePath of result.filePaths) {
    const baseName = path.basename(sourcePath)
    const destPath = path.join(info.modsPath, baseName)

    // Safety: Check for overwrites
    if (await pathExists(destPath)) {
      skippedMods.push(`Skipped ${baseName}: already exists in Mods folder.`)
      continue
    }

    await copyPath(sourcePath, destPath)
    addedPaths.push(destPath)
  }

  if (addedPaths.length === 0 && skippedMods.length > 0) {
    throw new Error('No mods were added. ' + skippedMods.join(' '))
  }

  return { success: true, addedPaths }
}

async function scanModsWithWorld(worldId?: string): Promise<ScanResult> {
  const info = await resolveInstallInfo()

  if (!info.activePath) {
    return { installPath: null, entries: [] }
  }

  const entries: ModEntry[] = []
  const disabledRoot = getDisabledRoot()
  const disabledPaths = {
    packs: path.join(disabledRoot, 'packs'),
    mods: path.join(disabledRoot, 'mods'),
    earlyplugins: path.join(disabledRoot, 'earlyplugins'),
  }

  // Get world overrides - either from specified world or active world
  let worldOverrides: Map<string, boolean> | null = null
  if (worldId && info.userDataPath) {
    const config = await getWorldConfig(worldId)
    if (config?.Mods) {
      worldOverrides = new Map()
      for (const [modId, modConfig] of Object.entries(config.Mods)) {
        if (typeof modConfig?.Enabled === 'boolean') {
          worldOverrides.set(modId, modConfig.Enabled)
        }
      }
    }
  } else {
    worldOverrides = await readActiveWorldModOverrides(info.userDataPath)
  }

  if (info.packsPath) {
    entries.push(...(await scanPacksFolder(info.packsPath, undefined, worldOverrides ?? undefined)))
  }

  if (await pathExists(disabledPaths.packs)) {
    entries.push(...(await scanPacksFolder(disabledPaths.packs, false, worldOverrides ?? undefined)))
  }

  if (info.modsPath) {
    entries.push(...(await scanModsFolder(info.modsPath, undefined, worldOverrides ?? undefined)))
  }

  if (await pathExists(disabledPaths.mods)) {
    entries.push(...(await scanModsFolder(disabledPaths.mods, false, worldOverrides ?? undefined)))
  }

  if (info.earlyPluginsPath) {
    entries.push(...(await scanEarlyPluginsFolder(info.earlyPluginsPath, undefined, worldOverrides ?? undefined)))
  }

  if (await pathExists(disabledPaths.earlyplugins)) {
    entries.push(...(await scanEarlyPluginsFolder(disabledPaths.earlyplugins, false, worldOverrides ?? undefined)))
  }

  entries.sort((a, b) => a.name.localeCompare(b.name))

  await seedProfilesFromScan(entries)
  await syncDefaultProfileFromScan(entries)

  return { installPath: info.activePath, entries }
}

// ============================================================================
// END WORLD MANAGEMENT FUNCTIONS
// ============================================================================

async function readManifestFromFolder(folderPath: string) {
  const rootManifest = path.join(folderPath, 'manifest.json')
  const serverManifest = path.join(folderPath, 'Server', 'manifest.json')
  // Plugin projects store manifest in src/main/resources
  const pluginManifest = path.join(folderPath, 'src', 'main', 'resources', 'manifest.json')

  if (await pathExists(rootManifest)) {
    return readJsonFile(rootManifest)
  }
  if (await pathExists(serverManifest)) {
    return readJsonFile(serverManifest)
  }
  if (await pathExists(pluginManifest)) {
    return readJsonFile(pluginManifest)
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
    return { manifest: null, hasClasses, manifestPath: null }
  }

  const manifestRaw = await manifestFile.async('string')
  const manifest = JSON.parse(manifestRaw) as Record<string, unknown>
  return { manifest, hasClasses, manifestPath: manifestFile.name }
}

const ASSET_KIND_BY_EXTENSION: Record<string, ModAssetKind> = {
  '.png': 'texture',
  '.jpg': 'texture',
  '.jpeg': 'texture',
  '.webp': 'texture',
  '.blockymodel': 'model',
  '.blockyanim': 'animation',
  '.ogg': 'audio',
  '.wav': 'audio',
}

const IMAGE_MIME_BY_EXTENSION: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
}

const DEFAULT_MAX_ASSETS = 200
const DEFAULT_MAX_PREVIEWS = 24
const DEFAULT_MAX_PREVIEW_BYTES = 500_000
const MAX_BUILD_OUTPUT = 50_000
const DEFAULT_MAX_SERVER_ASSETS = 300
const DEFAULT_MAX_VANILLA_ASSETS = 100000
const DEFAULT_MAX_VANILLA_ROOTS = 6
const MAX_VANILLA_SCAN_DEPTH = 4

const vanillaZipState: {
  zipPath: string | null
  zipfile: yauzl.ZipFile | null
  entries: VanillaAssetEntry[]
  isComplete: boolean
  isReading: Promise<void> | null
} = {
  zipPath: null,
  zipfile: null,
  entries: [],
  isComplete: false,
  isReading: null,
}

const SERVER_ASSET_TEMPLATE_BUILDERS: Record<ServerAssetTemplate, (id: string, label: string) => Record<string, unknown>> = {
  item: (id, _label) => ({
    PlayerAnimationsId: 'Item',
    Categories: ['Items.Misc'],
    MaxStack: 64,
    Icon: `Icons/ItemsGenerated/${id}.png`,
    Model: `Items/${id}.blockymodel`,
    Texture: `Icons/ItemsGenerated/${id}.png`
  }),
  item_sword: (id, label) => ({
    PlayerAnimationsId: 'OneHanded',
    Categories: ['Items.Weapons'],
    MaxStack: 1,
    Icon: `Icons/ItemsGenerated/${id}.png`,
    Model: `Items/${id}.blockymodel`,
    Texture: `Icons/ItemsGenerated/${id}.png`,
    TranslationProperties: {
      Name: label
    },
    Attacks: [
      {
        Damage: 10,
        Reach: 2.5,
        Time: 0.6
      }
    ],
    Durability: 250
  }),
  item_pickaxe: (id, label) => ({
    PlayerAnimationsId: 'Pickaxe',
    Categories: ['Items.Tools'],
    MaxStack: 1,
    Icon: `Icons/ItemsGenerated/${id}.png`,
    Model: `Items/${id}.blockymodel`,
    Texture: `Icons/ItemsGenerated/${id}.png`,
    TranslationProperties: {
      Name: label
    },
    GatheringAttributes: {
      Type: "Pickaxe",
      Level: 1,
      Efficiency: 5.0
    },
    Durability: 500
  }),
  block: (id, label) => ({
    BlockType: id,
    TranslationProperties: {
      Name: label
    },
    ExampleState: {
      RenderType: "Solid",
      Collidable: true
    }
  }),
  block_simple: (id, label) => ({
    BlockType: id,
    TranslationProperties: { Name: label },
    ExampleState: {
      RenderType: "Solid",
      Collidable: true,
      Hardness: 1.0,
      Resistance: 5.0
    }
  }),
  block_liquid: (id, label) => ({
    BlockType: id,
    TranslationProperties: { Name: label },
    ExampleState: {
      RenderType: "Fluid",
      Collidable: false,
      Liquid: true,
      Viscosity: 0.1
    }
  }),
  entity: (id, label) => ({
    Prefab: id,
    TranslationProperties: { Name: label },
    Character: {
      Model: `Lookups/Characters/${id}.blockymodel`,
      Scale: 1.0
    },
    Faction: "Neutral"
  }),
  entity_npc: (id, label) => ({
    Prefab: id,
    TranslationProperties: { Name: label },
    Character: {
      Model: `Lookups/Characters/${id}.blockymodel`,
      Scale: 1.0
    },
    Faction: "Neutral",
    Goals: ["Wander", "LookAround"]
  }),
  entity_mob: (id, label) => ({
    Prefab: id,
    TranslationProperties: { Name: label },
    Character: {
      Model: `Lookups/Characters/${id}.blockymodel`,
      Scale: 1.0
    },
    Faction: "Hostile",
    Goals: ["Wander", "LookAround", "AttackTarget"],
    Sensors: ["Sight", "Hearing"]
  }),
  audio: () => ({
    Events: []
  }),
  audio_sfx: (id) => ({
    Name: id,
    Events: []
  }),
  ui: () => ({
    Type: "Panel"
  }),
  ui_page: (id) => ({
    Name: id,
    Type: "Panel",
    Layout: "Vertical"
  }),
  category: (id, _label) => ({
    Icon: `Icons/${id}.png`,
    Order: 0,
    Children: [],
  }),
  empty: () => ({}),
}

function normalizeRelativePath(targetPath: string) {
  return targetPath.split(path.sep).join('/')
}

function normalizeRelativeInput(value: string) {
  return value.replace(/\\/g, '/').replace(/^\/+/, '').trim()
}

function ensureSafeRelativePath(root: string, relativePath: string) {
  const normalized = normalizeRelativeInput(relativePath)
  if (!normalized) {
    throw new Error('Relative path is required.')
  }
  if (normalized.split('/').some((part) => part === '..')) {
    throw new Error('Path cannot escape the mod folder.')
  }
  const resolved = path.resolve(root, normalized)
  if (!isWithinPath(resolved, root)) {
    throw new Error('Path must stay within the mod folder.')
  }
  return { normalized, resolved }
}

function ensureServerRelativePath(relativePath: string) {
  const normalized = normalizeRelativeInput(relativePath)
  if (!normalized.toLowerCase().startsWith('server/')) {
    throw new Error('Server assets must be placed under Server/.')
  }
  return normalized
}

function normalizeAssetId(name: string) {
  return name.replace(/\.json$/i, '').replace(/[^a-zA-Z0-9_.-]+/g, '_').replace(/^_+/, '')
}

function formatAssetLabel(name: string) {
  const stripped = name.replace(/\.json$/i, '')
  return stripped.replace(/[-_]+/g, ' ').trim() || stripped
}

function resolveServerAssetKind(relativePath: string, filePath: string): ServerAssetKind {
  const content = fsSync.readFileSync(filePath, 'utf-8')
  // Try to heuristic check by path first
  const loweredPath = relativePath.toLowerCase()
  if (loweredPath.includes('/items/') || loweredPath.includes('/item/')) return 'item'
  if (loweredPath.includes('/blocks/') || loweredPath.includes('/block/')) return 'block'
  if (loweredPath.includes('/entity/') || loweredPath.includes('/npc/')) return 'entity'

  // Naive content check
  try {
    const json = JSON.parse(content)
    if (json.BlockType) return 'block'
    if (json.Prefab) return 'entity'
    if (json.PlayerAnimationsId || json.MaxStack) return 'item'
    if (json.Events && Array.isArray(json.Events)) return 'audio'
  } catch { }

  return 'other'
}

async function buildServerAssetEntry(rootPath: string, filePath: string): Promise<ServerAsset> {
  const relativePath = normalizeRelativePath(path.relative(rootPath, filePath))
  const stat = await fs.stat(filePath)
  return {
    id: relativePath,
    name: path.basename(filePath),
    relativePath,
    absolutePath: filePath,
    kind: resolveServerAssetKind(relativePath, filePath),
    size: stat.size,
  }
}

async function findManifestPath(folderPath: string) {
  const rootManifest = path.join(folderPath, 'manifest.json')
  if (await pathExists(rootManifest)) return rootManifest
  const serverManifest = path.join(folderPath, 'Server', 'manifest.json')
  if (await pathExists(serverManifest)) return serverManifest
  // Plugin projects store manifest in src/main/resources
  const pluginManifest = path.join(folderPath, 'src', 'main', 'resources', 'manifest.json')
  if (await pathExists(pluginManifest)) return pluginManifest
  return null
}

function resolveAssetKind(extension: string): ModAssetKind {
  return ASSET_KIND_BY_EXTENSION[extension] ?? 'other'
}

function createAssetEntry(params: {
  name: string
  relativePath: string
  extension: string
  size: number | null
  previewDataUrl?: string
}): ModAsset {
  const kind = resolveAssetKind(params.extension)
  return {
    id: params.relativePath,
    name: params.name,
    relativePath: params.relativePath,
    kind,
    size: params.size,
    previewDataUrl: params.previewDataUrl,
  }
}

function getCandidateAssetRoots(rootPath: string, entries: string[]) {
  const roots = [] as string[]
  if (entries.includes('Common')) {
    roots.push(path.join(rootPath, 'Common'))
  }
  if (entries.includes('Server')) {
    roots.push(path.join(rootPath, 'Server'))
  }
  return roots.length ? roots : [rootPath]
}

async function listAssetsFromDirectory(options: ModAssetsOptions): Promise<ModAssetsResult> {
  const assets: ModAsset[] = []
  const maxAssets = options.maxAssets ?? DEFAULT_MAX_ASSETS
  const includePreviews = options.includePreviews !== false
  const maxPreviews = options.maxPreviews ?? DEFAULT_MAX_PREVIEWS
  const maxPreviewBytes = options.maxPreviewBytes ?? DEFAULT_MAX_PREVIEW_BYTES
  let previewCount = 0

  if (!(await pathExists(options.path))) {
    return { assets }
  }

  let rootEntries: string[] = []
  try {
    rootEntries = await fs.readdir(options.path)
  } catch {
    return { assets }
  }

  const roots = getCandidateAssetRoots(options.path, rootEntries)

  const visitDirectory = async (directory: string) => {
    const entries = await fs.readdir(directory, { withFileTypes: true })
    for (const entry of entries) {
      if (assets.length >= maxAssets) return
      const fullPath = path.join(directory, entry.name)
      if (entry.isDirectory()) {
        await visitDirectory(fullPath)
        continue
      }
      if (!entry.isFile()) continue
      const extension = path.extname(entry.name).toLowerCase()
      if (!Object.prototype.hasOwnProperty.call(ASSET_KIND_BY_EXTENSION, extension)) continue
      const relativePath = normalizeRelativePath(path.relative(options.path, fullPath))
      let size: number | null = null
      let previewDataUrl: string | undefined
      try {
        const stat = await fs.stat(fullPath)
        size = stat.size
        if (
          includePreviews &&
          previewCount < maxPreviews &&
          IMAGE_MIME_BY_EXTENSION[extension] &&
          stat.size <= maxPreviewBytes
        ) {
          const buffer = await fs.readFile(fullPath)
          previewDataUrl = `data:${IMAGE_MIME_BY_EXTENSION[extension]};base64,${buffer.toString('base64')}`
          previewCount += 1
        }
      } catch {
        // Failed to read asset
      }
      assets.push(
        createAssetEntry({
          name: entry.name,
          relativePath,
          extension,
          size,
          previewDataUrl,
        }),
      )
    }
  }

  for (const root of roots) {
    if (assets.length >= maxAssets) break
    await visitDirectory(root)
  }

  if (assets.length >= maxAssets) {
    // Asset list capped
  }

  return { assets }
}

async function listAssetsFromArchive(options: ModAssetsOptions): Promise<ModAssetsResult> {
  const assets: ModAsset[] = []
  const maxAssets = options.maxAssets ?? DEFAULT_MAX_ASSETS
  const includePreviews = options.includePreviews !== false
  const maxPreviews = options.maxPreviews ?? DEFAULT_MAX_PREVIEWS
  const maxPreviewBytes = options.maxPreviewBytes ?? DEFAULT_MAX_PREVIEW_BYTES
  let previewCount = 0

  if (!(await pathExists(options.path))) {
    return { assets }
  }

  const data = await fs.readFile(options.path)
  const zip = await JSZip.loadAsync(data)
  const files = Object.values(zip.files).filter((file) => !file.dir)

  const hasCommon = files.some((file) => file.name.startsWith('Common/'))
  const hasServer = files.some((file) => file.name.startsWith('Server/'))
  const prefixes = (hasCommon || hasServer) ? ['Common/', 'Server/'] : ['']

  for (const file of files) {
    if (assets.length >= maxAssets) break
    if (prefixes[0] && !prefixes.some((prefix) => file.name.startsWith(prefix))) {
      continue
    }
    const extension = path.extname(file.name).toLowerCase()
    if (!Object.prototype.hasOwnProperty.call(ASSET_KIND_BY_EXTENSION, extension)) continue
    const relativePath = file.name
    let size: number | null = null
    let previewDataUrl: string | undefined
    if (includePreviews && previewCount < maxPreviews && IMAGE_MIME_BY_EXTENSION[extension]) {
      const buffer = await file.async('nodebuffer')
      size = buffer.length
      if (buffer.length <= maxPreviewBytes) {
        previewDataUrl = `data:${IMAGE_MIME_BY_EXTENSION[extension]};base64,${buffer.toString('base64')}`
        previewCount += 1
      }
    }
    assets.push(
      createAssetEntry({
        name: path.basename(file.name),
        relativePath,
        extension,
        size,
        previewDataUrl,
      }),
    )
  }

  if (assets.length >= maxAssets) {
    // Asset list capped
  }

  return { assets }
}

async function listModAssets(options: ModAssetsOptions): Promise<ModAssetsResult> {
  if (options.format === 'directory') {
    return listAssetsFromDirectory(options)
  }
  return listAssetsFromArchive(options)
}

async function getModManifest(options: ModManifestOptions): Promise<ModManifestResult> {
  if (options.format !== 'directory') {
    const result = await readManifestFromArchive(options.path)
    if (!result.manifest) {
      return {
        manifestPath: result.manifestPath,
        content: null,
        readOnly: true,
      }
    }
    return {
      manifestPath: result.manifestPath,
      content: JSON.stringify(result.manifest, null, 2),
      readOnly: true,
    }
  }

  if (!(await pathExists(options.path))) {
    return {
      manifestPath: null,
      content: null,
      readOnly: false,
    }
  }

  const manifestPath = (await findManifestPath(options.path)) ?? path.join(options.path, 'manifest.json')

  try {
    if (await pathExists(manifestPath)) {
      const content = await fs.readFile(manifestPath, 'utf-8')
      return {
        manifestPath,
        content,
        readOnly: false,
      }
    }
  } catch {
    // Failed to read manifest
  }



  return {
    manifestPath,
    content: null,
    readOnly: false,
  }
}

async function saveModManifest(options: SaveManifestOptions): Promise<SaveManifestResult> {
  if (options.format !== 'directory') {
    throw new Error('Archived mods cannot be edited yet.')
  }

  if (!(await pathExists(options.path))) {
    throw new Error('Mod folder not found.')
  }


  let parsed: Record<string, unknown>
  try {
    parsed = JSON.parse(options.content) as Record<string, unknown>
  } catch {
    throw new Error('Manifest JSON is invalid.')
  }

  const manifestPath = (await findManifestPath(options.path)) ?? path.join(options.path, 'manifest.json')
  await ensureDir(path.dirname(manifestPath))
  await fs.writeFile(manifestPath, JSON.stringify(parsed, null, 2), 'utf-8')

  return { success: true }
}

async function runCommand(command: string, args: string[], cwd: string) {
  return await new Promise<{
    exitCode: number | null
    output: string
    durationMs: number
    truncated: boolean
  }>((resolve, reject) => {
    const startedAt = Date.now()
    let output = ''
    let truncated = false

    const appendOutput = (chunk: string) => {
      output += chunk
      if (output.length > MAX_BUILD_OUTPUT) {
        output = output.slice(output.length - MAX_BUILD_OUTPUT)
        truncated = true
      }
    }

    const child = spawn(command, args, {
      cwd,
      shell: process.platform === 'win32',
    })

    child.stdout?.on('data', (data) => appendOutput(data.toString()))
    child.stderr?.on('data', (data) => appendOutput(data.toString()))
    child.on('error', (error) => reject(error))
    child.on('close', (code) => {
      resolve({
        exitCode: code ?? null,
        output,
        durationMs: Date.now() - startedAt,
        truncated,
      })
    })
  })
}

async function buildMod(options: ModBuildOptions): Promise<ModBuildResult> {
  if (!(await pathExists(options.path))) {
    throw new Error('Workspace folder not found.')
  }

  const stat = await fs.stat(options.path)
  if (!stat.isDirectory()) {
    throw new Error('Workspace path must be a folder.')
  }

  const windowsWrapper = path.join(options.path, 'gradlew.bat')
  const unixWrapper = path.join(options.path, 'gradlew')
  let wrapperPath = ''
  if (await pathExists(windowsWrapper)) {
    wrapperPath = windowsWrapper
  } else if (await pathExists(unixWrapper)) {
    wrapperPath = unixWrapper
  }

  if (!wrapperPath) {
    throw new Error('Gradle wrapper not found in workspace.')
  }

  const taskArgs = options.task?.trim() ? options.task.trim().split(/\s+/) : ['build']

  const result = await runCommand(wrapperPath, taskArgs, options.path)

  return {
    success: result.exitCode === 0,
    exitCode: result.exitCode,
    output: result.output,
    durationMs: result.durationMs,
    truncated: result.truncated,
  }
}

async function listServerAssets(options: ServerAssetListOptions): Promise<ServerAssetListResult> {
  const assets: ServerAsset[] = []

  const maxAssets = options.maxAssets ?? DEFAULT_MAX_SERVER_ASSETS

  if (!(await pathExists(options.path))) {
    return { assets }
  }

  const stat = await fs.stat(options.path)
  if (!stat.isDirectory()) {
    return { assets }
  }

  const serverRoot = path.join(options.path, 'Server')
  if (!(await pathExists(serverRoot))) {
    return { assets }
  }

  const visitDirectory = async (directory: string) => {
    let entries: Dirent[] = []
    try {
      entries = await fs.readdir(directory, { withFileTypes: true })
    } catch {
      return
    }
    for (const entry of entries) {
      if (assets.length >= maxAssets) return
      const fullPath = path.join(directory, entry.name)
      if (entry.isDirectory()) {
        await visitDirectory(fullPath)
        continue
      }
      if (!entry.isFile()) continue
      if (!entry.name.toLowerCase().endsWith('.json')) continue
      if (entry.name.toLowerCase() === 'manifest.json') continue
      try {
        const asset = await buildServerAssetEntry(options.path, fullPath)
        assets.push(asset)
      } catch {
        // Failed to read asset
      }
    }
  }

  await visitDirectory(serverRoot)

  if (assets.length >= maxAssets) {
    // Server asset list capped
  }

  assets.sort((a, b) => a.relativePath.localeCompare(b.relativePath))

  return { assets }
}

async function createServerAsset(options: CreateServerAssetOptions): Promise<ServerAssetMutationResult> {


  if (!(await pathExists(options.path))) {
    throw new Error('Mod folder not found.')
  }

  const stat = await fs.stat(options.path)
  if (!stat.isDirectory()) {
    throw new Error('Mod path must be a folder.')
  }

  const destination = ensureServerRelativePath(options.destination)
  const { resolved: destinationPath } = ensureSafeRelativePath(options.path, destination)

  const trimmedName = options.name.trim()
  if (!trimmedName) {
    throw new Error('Asset name is required.')
  }
  if (trimmedName.includes('/') || trimmedName.includes('\\')) {
    throw new Error('Asset name cannot contain path separators.')
  }

  const rawFileName = trimmedName.toLowerCase().endsWith('.json') ? trimmedName : `${trimmedName}.json`
  const fileName = rawFileName.replace(/[<>:"\\|?*]/g, '_')
  if (fileName !== rawFileName) {
    // Invalid characters replaced
  }

  const filePath = path.join(destinationPath, fileName)
  if (!isWithinPath(filePath, options.path)) {
    throw new Error('Asset must remain inside the mod folder.')
  }
  if (await pathExists(filePath)) {
    throw new Error('An asset with this name already exists.')
  }

  await ensureDir(destinationPath)

  const assetId = normalizeAssetId(fileName)
  const label = formatAssetLabel(fileName)
  const templateBuilder = SERVER_ASSET_TEMPLATE_BUILDERS[options.template] ?? SERVER_ASSET_TEMPLATE_BUILDERS.empty
  const template = templateBuilder(assetId || 'Example_Id', label || 'Example Asset')
  await fs.writeFile(filePath, JSON.stringify(template, null, 2), 'utf-8')

  const asset = await buildServerAssetEntry(options.path, filePath)

  return { success: true, asset }
}

async function duplicateServerAsset(options: DuplicateServerAssetOptions): Promise<ServerAssetMutationResult> {

  const stat = await fs.stat(options.path)
  if (!stat.isDirectory()) {
    throw new Error('Mod path must be a folder.')
  }
  const sourceRelative = ensureServerRelativePath(options.source)
  const destinationRelative = ensureServerRelativePath(options.destination)

  const { resolved: sourcePath } = ensureSafeRelativePath(options.path, sourceRelative)
  const { resolved: destinationPath } = ensureSafeRelativePath(options.path, destinationRelative)

  if (!(await pathExists(sourcePath))) {
    throw new Error('Source asset not found.')
  }
  if (await pathExists(destinationPath)) {
    throw new Error('Destination already exists.')
  }

  await ensureDir(path.dirname(destinationPath))
  await fs.copyFile(sourcePath, destinationPath)

  const asset = await buildServerAssetEntry(options.path, destinationPath)

  return { success: true, asset }
}

async function moveServerAsset(options: MoveServerAssetOptions): Promise<ServerAssetMutationResult> {

  const stat = await fs.stat(options.path)
  if (!stat.isDirectory()) {
    throw new Error('Mod path must be a folder.')
  }
  const sourceRelative = ensureServerRelativePath(options.source)
  const destinationRelative = ensureServerRelativePath(options.destination)

  const { resolved: sourcePath } = ensureSafeRelativePath(options.path, sourceRelative)
  const { resolved: destinationPath } = ensureSafeRelativePath(options.path, destinationRelative)

  if (!(await pathExists(sourcePath))) {
    throw new Error('Source asset not found.')
  }
  if (await pathExists(destinationPath)) {
    throw new Error('Destination already exists.')
  }

  await ensureDir(path.dirname(destinationPath))
  await movePath(sourcePath, destinationPath)

  const asset = await buildServerAssetEntry(options.path, destinationPath)

  return { success: true, asset }
}

async function deleteServerAsset(options: DeleteServerAssetOptions): Promise<DeleteServerAssetResult> {
  const stat = await fs.stat(options.path)
  if (!stat.isDirectory()) {
    throw new Error('Mod path must be a folder.')
  }
  const relativePath = ensureServerRelativePath(options.relativePath)
  const { resolved: targetPath } = ensureSafeRelativePath(options.path, relativePath)

  if (!(await pathExists(targetPath))) {
    throw new Error('Asset not found.')
  }

  await fs.rm(targetPath, { force: true })

  return { success: true }
}

function shouldSkipVanillaDirectory(name: string) {
  const lowered = name.toLowerCase()
  return [
    'node_modules',
    '.git',
    'logs',
    'crashpad',
    'cache',
    'userdata',
    'mods',
    'packs',
    'earlyplugins',
    'hymn',
  ].includes(lowered)
}

async function findVanillaAssetRoots(installPath: string, maxRoots: number) {
  const roots = new Set<string>()
  const queue: Array<{ path: string; depth: number }> = [{ path: installPath, depth: 0 }]

  while (queue.length > 0 && roots.size < maxRoots) {
    const current = queue.shift()
    if (!current) continue
    if (current.depth > MAX_VANILLA_SCAN_DEPTH) continue

    let entries: Dirent[] = []
    try {
      entries = await fs.readdir(current.path, { withFileTypes: true })
    } catch {
      continue
    }

    for (const entry of entries) {
      if (!entry.isDirectory()) continue
      if (shouldSkipVanillaDirectory(entry.name)) continue
      const fullPath = path.join(current.path, entry.name)
      const lowerName = entry.name.toLowerCase()
      if (['server', 'serverdata', 'data', 'assets'].includes(lowerName)) {
        roots.add(fullPath)
        if (roots.size >= maxRoots) break
        continue
      }
      if (current.depth < MAX_VANILLA_SCAN_DEPTH) {
        queue.push({ path: fullPath, depth: current.depth + 1 })
      }
    }
  }

  return Array.from(roots)
}

async function findAssetsZipPath(installPath: string) {
  const gameRoot = path.join(installPath, 'install', 'release', 'package', 'game')
  const latestPath = path.join(gameRoot, 'latest', 'Assets.zip')
  if (await pathExists(latestPath)) {
    return latestPath
  }

  if (!(await pathExists(gameRoot))) {
    return null
  }

  const entries = await fs.readdir(gameRoot, { withFileTypes: true })
  const buildDirs = entries
    .filter((entry) => entry.isDirectory() && entry.name.startsWith('build-'))
    .map((entry) => entry.name)
    .sort((a, b) => {
      const aNum = Number.parseInt(a.replace('build-', ''), 10)
      const bNum = Number.parseInt(b.replace('build-', ''), 10)
      if (Number.isNaN(aNum) || Number.isNaN(bNum)) {
        return b.localeCompare(a)
      }
      return bNum - aNum
    })

  for (const buildDir of buildDirs) {
    const candidate = path.join(gameRoot, buildDir, 'Assets.zip')
    if (await pathExists(candidate)) {
      return candidate
    }
  }

  return null
}

function resetVanillaZipState(zipPath: string) {
  if (vanillaZipState.zipfile) {
    vanillaZipState.zipfile.close()
  }
  vanillaZipState.zipPath = zipPath
  vanillaZipState.zipfile = null
  vanillaZipState.entries = []
  vanillaZipState.isComplete = false
  vanillaZipState.isReading = null
}

async function openZipFile(zipPath: string) {
  return await new Promise<yauzl.ZipFile>((resolve, reject) => {
    yauzl.open(
      zipPath,
      { lazyEntries: true, autoClose: false },
      (error, zipfile) => {
        if (error || !zipfile) {
          reject(error ?? new Error('Unable to open Assets.zip'))
          return
        }
        resolve(zipfile)
      },
    )
  })
}

async function readNextZipEntry(zipfile: yauzl.ZipFile) {
  return await new Promise<yauzl.Entry | null>((resolve, reject) => {
    const handleEntry = (entry: yauzl.Entry) => {
      cleanup()
      resolve(entry)
    }

    const handleEnd = () => {
      cleanup()
      resolve(null)
    }

    const handleError = (error: Error) => {
      cleanup()
      reject(error)
    }

    const cleanup = () => {
      zipfile.off('entry', handleEntry)
      zipfile.off('end', handleEnd)
      zipfile.off('error', handleError)
    }

    zipfile.once('entry', handleEntry)
    zipfile.once('end', handleEnd)
    zipfile.once('error', handleError)
    zipfile.readEntry()
  })
}

async function ensureVanillaZipEntries(zipPath: string, targetCount: number, maxAssets: number) {
  if (vanillaZipState.zipPath !== zipPath) {
    resetVanillaZipState(zipPath)
  }

  if (vanillaZipState.entries.length >= targetCount || vanillaZipState.isComplete) {
    return
  }

  if (vanillaZipState.isReading) {
    await vanillaZipState.isReading
    if (vanillaZipState.entries.length >= targetCount || vanillaZipState.isComplete) {
      return
    }
  }

  vanillaZipState.isReading = (async () => {
    if (!vanillaZipState.zipfile) {
      vanillaZipState.zipfile = await openZipFile(zipPath)
    }

    const zipfile = vanillaZipState.zipfile

    while (vanillaZipState.entries.length < targetCount && !vanillaZipState.isComplete) {
      if (vanillaZipState.entries.length >= maxAssets) {
        vanillaZipState.isComplete = true
        break
      }

      const entry = await readNextZipEntry(zipfile)
      if (!entry) {
        vanillaZipState.isComplete = true
        break
      }

      if (entry.fileName.endsWith('/')) {
        continue
      }

      const entryPath = entry.fileName.replace(/\\/g, '/')
      vanillaZipState.entries.push({
        id: `${zipPath}:${entryPath}`,
        name: path.basename(entryPath),
        sourceType: 'zip',
        sourcePath: zipPath,
        archivePath: zipPath,
        entryPath,
        relativePath: entryPath,
        originRoot: zipPath,
        size: Number.isFinite(entry.uncompressedSize) ? entry.uncompressedSize : null,
      })
    }

    if (vanillaZipState.isComplete && vanillaZipState.zipfile) {
      vanillaZipState.zipfile.close()
      vanillaZipState.zipfile = null
    }
  })()

  try {
    await vanillaZipState.isReading
  } finally {
    vanillaZipState.isReading = null
  }
}

async function listVanillaAssets(options: VanillaAssetListOptions): Promise<VanillaAssetListResult> {
  const info = await resolveInstallInfo()
  if (!info.activePath) {
    throw new Error('Hytale install path not configured.')
  }


  const maxAssets = options.maxAssets ?? DEFAULT_MAX_VANILLA_ASSETS
  const maxRoots = options.maxRoots ?? DEFAULT_MAX_VANILLA_ROOTS
  const offset = Math.max(options.offset ?? 0, 0)
  const limit = Math.max(options.limit ?? 200, 1)
  const targetCount = Math.min(offset + limit, maxAssets)
  const assets: VanillaAssetEntry[] = []

  const assetsZipPath = await findAssetsZipPath(info.activePath)
  if (assetsZipPath) {
    if (offset === 0 && vanillaZipState.zipPath === assetsZipPath) {
      if (vanillaZipState.isReading) {
        await vanillaZipState.isReading
      }
      resetVanillaZipState(assetsZipPath)
    }
    await ensureVanillaZipEntries(assetsZipPath, targetCount, maxAssets)
    if (vanillaZipState.entries.length === 0 && vanillaZipState.isComplete) {
      // Assets.zip contained no files
    }
    const slice = vanillaZipState.entries.slice(offset, offset + limit)
    const nextOffset = offset + slice.length
    const hasMore = nextOffset < vanillaZipState.entries.length || !vanillaZipState.isComplete
    return {
      assets: slice,
      roots: [assetsZipPath],
      hasMore,
      nextOffset,
    }
  }

  const roots = await findVanillaAssetRoots(info.activePath, maxRoots)
  if (roots.length === 0) {
    return { assets, roots, hasMore: false, nextOffset: offset }
  }

  const visitDirectory = async (root: string, directory: string) => {
    let entries: Dirent[] = []
    try {
      entries = await fs.readdir(directory, { withFileTypes: true })
    } catch {
      return
    }

    for (const entry of entries) {
      if (assets.length >= maxAssets) return
      const fullPath = path.join(directory, entry.name)
      if (entry.isDirectory()) {
        if (shouldSkipVanillaDirectory(entry.name)) continue
        await visitDirectory(root, fullPath)
        continue
      }
      if (!entry.isFile()) continue
      try {
        const stat = await fs.stat(fullPath)
        const relativePath = normalizeRelativePath(path.relative(root, fullPath))
        assets.push({
          id: `${root}:${relativePath}`,
          name: entry.name,
          sourceType: 'filesystem',
          sourcePath: fullPath,
          relativePath,
          originRoot: root,
          size: stat.size,
        })
      } catch {
        // Failed to read asset
      }
    }
  }

  for (const root of roots) {
    if (assets.length >= maxAssets) break
    await visitDirectory(root, root)
  }

  if (assets.length >= maxAssets) {
    // Vanilla asset list capped
  }

  assets.sort((a, b) => a.relativePath.localeCompare(b.relativePath))

  const slicedAssets = assets.slice(offset, offset + limit)
  const nextOffset = offset + slicedAssets.length
  const hasMore = nextOffset < assets.length

  return { assets: slicedAssets, roots, hasMore, nextOffset }
}

async function extractZipEntry(archivePath: string, entryPath: string, destinationPath: string) {
  const zipfile = await openZipFile(archivePath)
  const normalizedTarget = entryPath.replace(/\\/g, '/')

  return await new Promise<void>((resolve, reject) => {
    let resolved = false

    const cleanup = () => {
      zipfile.off('entry', handleEntry)
      zipfile.off('end', handleEnd)
      zipfile.off('error', handleError)
    }

    const finish = async (error?: Error | null) => {
      if (resolved) return
      resolved = true
      cleanup()
      zipfile.close()
      if (error) {
        reject(error)
      } else {
        resolve()
      }
    }

    const handleEntry = (entry: yauzl.Entry) => {
      if (entry.fileName.endsWith('/')) {
        zipfile.readEntry()
        return
      }
      const currentPath = entry.fileName.replace(/\\/g, '/')
      if (currentPath !== normalizedTarget) {
        zipfile.readEntry()
        return
      }

      zipfile.openReadStream(entry, (error, readStream) => {
        if (error || !readStream) {
          void finish(error ?? new Error('Unable to read archive entry.'))
          return
        }
        pipeline(readStream, createWriteStream(destinationPath))
          .then(() => finish())
          .catch((err) => finish(err instanceof Error ? err : new Error('Failed to write archive entry.')))
      })
    }

    const handleEnd = () => {
      void finish(new Error('Asset entry not found in archive.'))
    }

    const handleError = (error: Error) => {
      void finish(error)
    }

    zipfile.on('entry', handleEntry)
    zipfile.once('end', handleEnd)
    zipfile.once('error', handleError)
    zipfile.readEntry()
  })
}

async function importVanillaAsset(options: ImportVanillaAssetOptions): Promise<ImportVanillaAssetResult> {


  if (!(await pathExists(options.destinationPath))) {
    throw new Error('Destination mod folder not found.')
  }

  const destinationStat = await fs.stat(options.destinationPath)
  if (!destinationStat.isDirectory()) {
    throw new Error('Destination mod path must be a folder.')
  }

  const destinationRelative = options.destinationRelativePath.trim()
  if (!destinationRelative) {
    throw new Error('Destination path is required.')
  }

  const { resolved: destinationPath } = ensureSafeRelativePath(options.destinationPath, destinationRelative)

  if (await pathExists(destinationPath)) {
    throw new Error('Destination file already exists.')
  }

  await ensureDir(path.dirname(destinationPath))

  if (options.sourceType === 'zip') {
    if (!options.archivePath || !options.entryPath) {
      throw new Error('Archive path and entry path are required.')
    }
    if (!(await pathExists(options.archivePath))) {
      throw new Error('Source archive not found.')
    }
    await extractZipEntry(options.archivePath, options.entryPath, destinationPath)
  } else {
    if (!options.sourcePath) {
      throw new Error('Source path is required.')
    }
    if (!(await pathExists(options.sourcePath))) {
      throw new Error('Source asset not found.')
    }
    await fs.copyFile(options.sourcePath, destinationPath)
  }

  const asset = await buildServerAssetEntry(options.destinationPath, destinationPath)

  return { success: true, asset }
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

function readManifestDependencies(value: unknown) {
  if (value == null) {
    return []
  }
  // Handle array format: ["mod1", "mod2"]
  if (Array.isArray(value)) {
    return value.filter((item) => typeof item === 'string')
  }
  // Handle object format: { "mod1": ">=1.0.0", "mod2": "*" } or empty {}
  if (typeof value === 'object' && value !== null) {
    const keys = Object.keys(value as Record<string, unknown>)
    return keys
  }
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
  enabledOverrides?: Map<string, boolean>
  size?: number
}): ModEntry {
  const name = typeof params.manifest?.Name === 'string' ? params.manifest.Name : params.fallbackName
  const group = typeof params.manifest?.Group === 'string' ? params.manifest.Group : undefined
  const version = typeof params.manifest?.Version === 'string' ? params.manifest.Version : undefined
  const description = typeof params.manifest?.Description === 'string' ? params.manifest.Description : undefined
  let entryPoint: string | null = null

  if (params.manifest?.Main !== undefined) {
    if (typeof params.manifest.Main === 'string') {
      entryPoint = params.manifest.Main
    }
  }

  const includesAssetPackValue = params.manifest?.IncludesAssetPack
  const dependencies = readManifestDependencies(params.manifest?.Dependencies)
  const optionalDependencies = readManifestDependencies(params.manifest?.OptionalDependencies)
  const includesAssetPack = includesAssetPackValue === true

  const id = group ? `${group}:${name}` : name
  const overrideValue = params.enabledOverrides?.get(id)
  // Hytale defaults mods to disabled if not explicitly enabled in config
  // So we default to false (disabled) when no override is found
  const enabled =
    typeof params.enabledOverride === 'boolean'
      ? params.enabledOverride
      : typeof overrideValue === 'boolean'
        ? overrideValue
        : false

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
    size: params.size,
  }
}

// appendEntryWarnings removed - warnings no longer tracked

async function scanPacksFolder(
  packsPath: string,
  enabledOverride?: boolean,
  enabledOverrides?: Map<string, boolean>,
) {
  const entries = await fs.readdir(packsPath, { withFileTypes: true })
  const mods: ModEntry[] = []

  for (const entry of entries) {
    if (!entry.isDirectory()) continue
    const fullPath = path.join(packsPath, entry.name)
    let manifest: Record<string, unknown> | null = null

    try {
      manifest = await readManifestFromFolder(fullPath)
    } catch {
      // Failed to read manifest.json
    }

    const size = await getPathSize(fullPath)

    const modEntry = createModEntry({
      manifest,
      fallbackName: entry.name,
      format: 'directory',
      location: 'packs',
      path: fullPath,
      enabledOverride,
      enabledOverrides,
      size,
    })

    mods.push(modEntry)
  }

  return mods
}

async function scanModsFolder(
  modsPath: string,
  enabledOverride?: boolean,
  enabledOverrides?: Map<string, boolean>,
) {
  const entries = await fs.readdir(modsPath, { withFileTypes: true })
  const mods: ModEntry[] = []

  for (const entry of entries) {
    const fullPath = path.join(modsPath, entry.name)

    if (entry.isDirectory()) {
      let manifest: Record<string, unknown> | null = null

      try {
        manifest = await readManifestFromFolder(fullPath)
      } catch {
        // Failed to read manifest.json
      }

      const size = await getPathSize(fullPath)

      const modEntry = createModEntry({
        manifest,
        fallbackName: entry.name,
        format: 'directory',
        location: 'mods',
        path: fullPath,
        enabledOverride,
        enabledOverrides,
        size,
      })

      mods.push(modEntry)
      continue
    }

    const lowerName = entry.name.toLowerCase()
    if (!lowerName.endsWith('.zip') && !lowerName.endsWith('.jar')) {
      continue
    }

    let manifest: Record<string, unknown> | null = null
    let hasClasses = false

    try {
      const result = await readManifestFromArchive(fullPath)
      manifest = result.manifest
      hasClasses = result.hasClasses
    } catch {
      // Failed to read archive manifest
    }

    const size = await getPathSize(fullPath)
    const format: ModFormat = lowerName.endsWith('.jar') ? 'jar' : 'zip'
    const modEntry = createModEntry({
      manifest,
      fallbackName: entry.name,
      format,
      location: 'mods',
      path: fullPath,
      hasClasses,
      enabledOverride,
      enabledOverrides,
      size,
    })

    mods.push(modEntry)
  }

  return mods
}

async function scanEarlyPluginsFolder(
  earlyPluginsPath: string,
  enabledOverride?: boolean,
  enabledOverrides?: Map<string, boolean>,
) {
  const entries = await fs.readdir(earlyPluginsPath, { withFileTypes: true })
  const mods: ModEntry[] = []

  for (const entry of entries) {
    if (!entry.isFile()) continue
    const lowerName = entry.name.toLowerCase()
    if (!lowerName.endsWith('.jar')) continue

    const fullPath = path.join(earlyPluginsPath, entry.name)
    let manifest: Record<string, unknown> | null = null
    let hasClasses = false

    try {
      const result = await readManifestFromArchive(fullPath)
      manifest = result.manifest
      hasClasses = result.hasClasses
    } catch {
      // Failed to read archive manifest
    }

    const size = await getPathSize(fullPath)

    const modEntry = createModEntry({
      manifest,
      fallbackName: entry.name,
      format: 'jar',
      location: 'earlyplugins',
      path: fullPath,
      hasClasses,
      enabledOverride,
      enabledOverrides,
      size,
    })

    mods.push(modEntry)
  }

  return mods
}

async function scanMods(): Promise<ScanResult> {
  const info = await resolveInstallInfo()

  if (!info.activePath) {
    return { installPath: null, entries: [] }
  }

  const entries: ModEntry[] = []
  const disabledRoot = getDisabledRoot()
  const disabledPaths = {
    packs: path.join(disabledRoot, 'packs'),
    mods: path.join(disabledRoot, 'mods'),
    earlyplugins: path.join(disabledRoot, 'earlyplugins'),
  }
  const worldOverrides = await readActiveWorldModOverrides(info.userDataPath)

  if (info.packsPath) {
    entries.push(...(await scanPacksFolder(info.packsPath, undefined, worldOverrides ?? undefined)))
  }

  if (await pathExists(disabledPaths.packs)) {
    entries.push(...(await scanPacksFolder(disabledPaths.packs, false, worldOverrides ?? undefined)))
  }

  if (info.modsPath) {
    entries.push(...(await scanModsFolder(info.modsPath, undefined, worldOverrides ?? undefined)))
  }

  if (await pathExists(disabledPaths.mods)) {
    entries.push(...(await scanModsFolder(disabledPaths.mods, false, worldOverrides ?? undefined)))
  }

  if (info.earlyPluginsPath) {
    entries.push(...(await scanEarlyPluginsFolder(info.earlyPluginsPath, undefined, worldOverrides ?? undefined)))
  }

  if (await pathExists(disabledPaths.earlyplugins)) {
    entries.push(...(await scanEarlyPluginsFolder(disabledPaths.earlyplugins, false, worldOverrides ?? undefined)))
  }

  entries.sort((a, b) => a.name.localeCompare(b.name))

  await seedProfilesFromScan(entries)
  await syncDefaultProfileFromScan(entries)

  return { installPath: info.activePath, entries }
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
) {
  if (!destination) {
    return
  }
  await removePath(destination)
  if (await pathExists(snapshotPath)) {
    await copyPath(snapshotPath, destination)
    return
  }
  await ensureDir(destination)
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
  const enabledSet = new Set(profile.enabledMods)
  const entryIds = new Set(scan.entries.map((entry) => entry.id))

  for (const id of enabledSet) {
    if (!entryIds.has(id)) {
      // Mod not found in library
    }
  }

  const disabledRoot = getDisabledRoot()

  for (const entry of scan.entries) {
    const shouldEnable = enabledSet.has(entry.id)
    const currentlyDisabled = isWithinPath(entry.path, disabledRoot)

    if (shouldEnable && currentlyDisabled) {
      const targetRoot = getLocationPath(info, entry.location)
      if (!targetRoot) {
        continue
      }
      await ensureDir(targetRoot)
      const targetPath = path.join(targetRoot, path.basename(entry.path))
      if (await pathExists(targetPath)) {
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
        continue
      }
      await movePath(entry.path, targetPath)
    }
  }

  await syncActiveWorldModConfig(info.userDataPath, enabledSet, scan.entries)
  await writeSetting(SETTINGS_KEYS.lastSnapshot, snapshot.id)

  return {
    profileId: profile.id,
    snapshotId: snapshot.id,
    appliedAt: snapshot.createdAt,
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

  await restoreSnapshotFolder(path.join(snapshotRoot, 'mods'), getLocationPath(info, 'mods'))
  await restoreSnapshotFolder(
    path.join(snapshotRoot, 'packs'),
    getLocationPath(info, 'packs'),
  )
  await restoreSnapshotFolder(
    path.join(snapshotRoot, 'earlyplugins'),
    getLocationPath(info, 'earlyplugins'),
  )
  await restoreSnapshotFolder(path.join(snapshotRoot, 'disabled'), getDisabledRoot())

  return {
    snapshotId,
    restoredAt: new Date().toISOString(),
  }
}

async function createPack(options: CreatePackOptions): Promise<CreatePackResult> {
  const info = await resolveInstallInfo()
  if (!info.activePath) {
    throw new Error('Hytale install path not configured.')
  }


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
  }
}

async function createPlugin(options: CreatePluginOptions): Promise<CreatePluginResult> {
  const info = await resolveInstallInfo()
  if (!info.activePath) {
    throw new Error('Hytale install path not configured.')
  }

  const pluginName = options.name.trim() || 'NewPlugin'
  const safeName = pluginName.replace(/[^a-zA-Z0-9_-]/g, '')
  const group = options.group.trim() || 'com.example'
  const version = options.version?.trim() || '0.0.1'
  const javaVersion = options.javaVersion ?? 25
  const patchline = options.patchline ?? 'release'
  const includesAssetPack = options.includesAssetPack ?? true

  // Plugin goes into Mods folder
  const modsPath = info.modsPath ?? path.join(info.activePath, 'UserData', 'Mods')
  await ensureDir(modsPath)

  const pluginPath = path.join(modsPath, safeName)
  if (await pathExists(pluginPath)) {
    throw new Error(`A plugin named "${safeName}" already exists.`)
  }

  await ensureDir(pluginPath)

  // Create directory structure
  const packagePath = group.replace(/\./g, '/')
  const javaSourcePath = path.join(pluginPath, 'src', 'main', 'java', packagePath)
  const resourcesPath = path.join(pluginPath, 'src', 'main', 'resources')
  const serverResourcesPath = path.join(resourcesPath, 'Server')
  const gradleWrapperPath = path.join(pluginPath, 'gradle', 'wrapper')

  await ensureDir(javaSourcePath)
  await ensureDir(resourcesPath)
  await ensureDir(serverResourcesPath)
  await ensureDir(gradleWrapperPath)

  // Generate main class name from plugin name
  const mainClassName = safeName.charAt(0).toUpperCase() + safeName.slice(1)
  const fullMainClass = `${group}.${mainClassName}`

  // --- Template Files ---

  // settings.gradle
  const settingsGradle = `rootProject.name = '${safeName}'
`
  await fs.writeFile(path.join(pluginPath, 'settings.gradle'), settingsGradle, 'utf-8')

  // gradle.properties
  const gradleProperties = `# The current version of your project. Please use semantic versioning!
version=${version}

# The group ID used for maven publishing. Usually the same as your package name
# but not the same as your plugin group!
maven_group=${group}

# The version of Java used by your plugin. The game is built on Java 21 but
# actually runs on Java 25.
java_version=${javaVersion}

# Determines if your plugin should also be loaded as an asset pack. If your
# pack contains assets, or you intend to use the in-game asset editor, you
# want this to be true.
includes_pack=${includesAssetPack}

# The release channel your plugin should be built and ran against. This is
# usually release or pre-release. You can verify your settings in the
# official launcher.
patchline=${patchline}

# Determines if the development server should also load mods from the user's
# standard mods folder. This lets you test mods by installing them where a
# normal player would, instead of adding them as dependencies or adding them
# to the development server manually.
load_user_mods=false

# If Hytale was installed to a custom location, you must set the home path
# manually. You may also want to use a custom path if you are building in
# a non-standard environment like a build server. The home path should
# the folder that contains the install and UserData folder.
# hytale_home=./test-file
`
  await fs.writeFile(path.join(pluginPath, 'gradle.properties'), gradleProperties, 'utf-8')

  // build.gradle
  const buildGradle = `plugins {
    id 'java'
    id 'idea'
}

group = project.maven_group
version = project.version

java {
    toolchain {
        languageVersion = JavaLanguageVersion.of(project.java_version as int)
    }
}

repositories {
    mavenCentral()
}

// Locate Hytale installation
def hytaleHome = project.hasProperty('hytale_home') && project.hytale_home?.trim()
    ? file(project.hytale_home)
    : file(System.getProperty('os.name').toLowerCase().contains('win')
        ? System.getenv('LOCALAPPDATA') + '/Hytale'
        : System.getProperty('os.name').toLowerCase().contains('mac')
            ? System.getProperty('user.home') + '/Library/Application Support/Hytale'
            : System.getProperty('user.home') + '/.local/share/Hytale')

def patchline = project.hasProperty('patchline') ? project.patchline : 'release'
def hytaleInstall = file("\${hytaleHome}/install/\${patchline}")
def hytaleServer = file("\${hytaleInstall}/server/HytaleServer.jar")

dependencies {
    compileOnly files(hytaleServer)
}

// Update manifest.json with version and includes_pack from gradle.properties
tasks.register('updatePluginManifest') {
    def manifestFile = file('src/main/resources/manifest.json')
    doLast {
        if (manifestFile.exists()) {
            def manifest = new groovy.json.JsonSlurper().parse(manifestFile)
            manifest.Version = project.version
            manifest.IncludesAssetPack = project.includes_pack.toBoolean()
            manifestFile.text = groovy.json.JsonOutput.prettyPrint(groovy.json.JsonOutput.toJson(manifest))
        }
    }
}

tasks.named('processResources') {
    dependsOn 'updatePluginManifest'
}

// Build JAR
tasks.named('jar') {
    from('src/main/resources') {
        include '**/*'
    }
    archiveBaseName = project.name
    archiveVersion = project.version
    destinationDirectory = file("\${buildDir}/libs")
}

// IntelliJ IDEA run configuration
idea {
    module {
        inheritOutputDirs = true
    }
}

tasks.register('generateIdeaRunConfig') {
    def runDir = file("\${projectDir}/run")
    def configDir = file("\${projectDir}/.idea/runConfigurations")

    doLast {
        configDir.mkdirs()
        def loadUserMods = project.hasProperty('load_user_mods') && project.load_user_mods.toBoolean()
        def userDataMods = loadUserMods ? "\${hytaleHome}/UserData/Mods" : ''

        def configXml = """<component name="ProjectRunConfigurationManager">
  <configuration default="false" name="Run Hytale Server" type="Application" factoryName="Application">
    <option name="MAIN_CLASS_NAME" value="com.hypixel.hytale.server.HytaleServer" />
    <module name="\${project.name}.main" />
    <option name="PROGRAM_PARAMETERS" value="--mod-paths=&quot;\${projectDir}/build/libs&quot;\${loadUserMods ? ",&quot;\${userDataMods}&quot;" : ''} --asset-paths=&quot;\${projectDir}/src/main/resources&quot;" />
    <option name="WORKING_DIRECTORY" value="\${runDir}" />
    <classpath>
      <root path="\${hytaleServer}" type="path" />
    </classpath>
  </configuration>
</component>"""
        file("\${configDir}/Run_Hytale_Server.xml").text = configXml
    }
}

// VS Code launch configuration
tasks.register('generateVSCodeLaunch') {
    def vscodeDir = file("\${projectDir}/.vscode")

    doLast {
        vscodeDir.mkdirs()
        def loadUserMods = project.hasProperty('load_user_mods') && project.load_user_mods.toBoolean()
        def userDataMods = loadUserMods ? ",\${hytaleHome}/UserData/Mods" : ''

        def launchJson = """{
    "version": "0.2.0",
    "configurations": [
        {
            "type": "java",
            "name": "Run Hytale Server",
            "request": "launch",
            "mainClass": "com.hypixel.hytale.server.HytaleServer",
            "classPaths": ["\${hytaleServer}"],
            "args": "--mod-paths=\\"\${projectDir}/build/libs\\"\${loadUserMods ? ",\\"\${userDataMods}\\"" : ''} --asset-paths=\\"\${projectDir}/src/main/resources\\"",
            "cwd": "\${projectDir}/run"
        }
    ]
}"""
        file("\${vscodeDir}/launch.json").text = launchJson
    }
}
`
  await fs.writeFile(path.join(pluginPath, 'build.gradle'), buildGradle, 'utf-8')

  // .gitignore
  const gitignore = `### Gradle ###
.gradle
build/
!gradle/wrapper/gradle-wrapper.jar
!**/src/main/**/build/
!**/src/test/**/build/

### Hytale ###
run/

### IntelliJ IDEA ###
.idea/
*.iws
*.iml
*.ipr
out/
!**/src/main/**/out/
!**/src/test/**/out/

### Eclipse ###
.apt_generated
.classpath
.factorypath
.project
.settings
.springBeans
.sts4-cache
bin/
!**/src/main/**/bin/
!**/src/test/**/bin/

### NetBeans ###
/nbproject/private/
/nbbuild/
/dist/
/nbdist/
/.nb-gradle/

### VS Code ###
.vscode/

### Mac OS ###
.DS_Store
`
  await fs.writeFile(path.join(pluginPath, '.gitignore'), gitignore, 'utf-8')

  // gradlew (Unix)
  const gradlew = `#!/bin/sh

#
# Copyright 2015-2021 the original authors.
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#      https://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.
#

##############################################################################
##
##  Gradle start up script for UN*X
##
##############################################################################

# Attempt to set APP_HOME
# Resolve links: $0 may be a link
PRG="$0"
while [ -h "$PRG" ] ; do
    ls=\`ls -ld "$PRG"\`
    link=\`expr "$ls" : '.*-> \\(.*\\)$'\`
    if expr "$link" : '/.*' > /dev/null; then
        PRG="$link"
    else
        PRG=\`dirname "$PRG"\`"/$link"
    fi
done
SAVED="\`pwd\`"
cd "\`dirname \\"$PRG\\"\`/" >/dev/null
APP_HOME="\`pwd -P\`"
cd "$SAVED" >/dev/null

APP_NAME="Gradle"
APP_BASE_NAME=\`basename "$0"\`

# Add default JVM options here.
DEFAULT_JVM_OPTS='"-Xmx64m" "-Xms64m"'

# Use the maximum available, or set MAX_FD != -1 to use that value.
MAX_FD="maximum"

warn () {
    echo "$*"
}

die () {
    echo
    echo "$*"
    echo
    exit 1
}

# OS specific support
cygwin=false
msys=false
darwin=false
nonstop=false
case "\`uname\`" in
  CYGWIN* )
    cygwin=true
    ;;
  Darwin* )
    darwin=true
    ;;
  MSYS* | MINGW* )
    msys=true
    ;;
  NONSTOP* )
    nonstop=true
    ;;
esac

CLASSPATH=$APP_HOME/gradle/wrapper/gradle-wrapper.jar

# Determine the Java command to use to start the JVM.
if [ -n "$JAVA_HOME" ] ; then
    if [ -x "$JAVA_HOME/jre/sh/java" ] ; then
        JAVACMD="$JAVA_HOME/jre/sh/java"
    else
        JAVACMD="$JAVA_HOME/bin/java"
    fi
    if [ ! -x "$JAVACMD" ] ; then
        die "ERROR: JAVA_HOME is set to an invalid directory: $JAVA_HOME"
    fi
else
    JAVACMD="java"
    which java >/dev/null 2>&1 || die "ERROR: JAVA_HOME is not set and no 'java' command could be found in your PATH."
fi

# Increase the maximum file descriptors if we can.
if [ "$cygwin" = "false" ] && [ "$darwin" = "false" ] && [ "$nonstop" = "false" ] ; then
    MAX_FD_LIMIT=\`ulimit -H -n\`
    if [ $? -eq 0 ] ; then
        if [ "$MAX_FD" = "maximum" ] || [ "$MAX_FD" = "max" ] ; then
            MAX_FD="$MAX_FD_LIMIT"
        fi
        ulimit -n $MAX_FD
        if [ $? -ne 0 ] ; then
            warn "Could not set maximum file descriptor limit: $MAX_FD"
        fi
    else
        warn "Could not query maximum file descriptor limit: $MAX_FD_LIMIT"
    fi
fi

# For Cygwin or MSYS, switch paths to Windows format before running java
if [ "$cygwin" = "true" ] || [ "$msys" = "true" ] ; then
    APP_HOME=\`cygpath --path --mixed "$APP_HOME"\`
    CLASSPATH=\`cygpath --path --mixed "$CLASSPATH"\`
    JAVACMD=\`cygpath --unix "$JAVACMD"\`
fi

# Collect all arguments for the java command;
#   * DEFAULT_JVM_OPTS, JAVA_OPTS, and GRADLE_OPTS environment variables
#   * Command line arguments
eval set -- $DEFAULT_JVM_OPTS $JAVA_OPTS $GRADLE_OPTS "\\"-Dorg.gradle.appname=$APP_BASE_NAME\\"" -classpath "\\"$CLASSPATH\\"" org.gradle.wrapper.GradleWrapperMain "$@"

exec "$JAVACMD" "$@"
`
  await fs.writeFile(path.join(pluginPath, 'gradlew'), gradlew, 'utf-8')
  // Make gradlew executable on Unix systems
  try {
    await fs.chmod(path.join(pluginPath, 'gradlew'), 0o755)
  } catch {
    // Ignore chmod errors on Windows
  }

  // gradlew.bat (Windows)
  const gradlewBat = `@rem
@rem Copyright 2015-2021 the original authors.
@rem
@rem Licensed under the Apache License, Version 2.0 (the "License");
@rem you may not use this file except in compliance with the License.
@rem You may obtain a copy of the License at
@rem
@rem      https://www.apache.org/licenses/LICENSE-2.0
@rem
@rem Unless required by applicable law or agreed to in writing, software
@rem distributed under the License is distributed on an "AS IS" BASIS,
@rem WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
@rem See the License for the specific language governing permissions and
@rem limitations under the License.
@rem

@if "%DEBUG%" == "" @echo off
@rem ##########################################################################
@rem
@rem  Gradle startup script for Windows
@rem
@rem ##########################################################################

@rem Set local scope for the variables with windows NT shell
if "%OS%"=="Windows_NT" setlocal

set DIRNAME=%~dp0
if "%DIRNAME%" == "" set DIRNAME=.
set APP_BASE_NAME=%~n0
set APP_HOME=%DIRNAME%

@rem Add default JVM options here.
set DEFAULT_JVM_OPTS="-Xmx64m" "-Xms64m"

@rem Find java.exe
if defined JAVA_HOME goto findJavaFromJavaHome

set JAVA_EXE=java.exe
%JAVA_EXE% -version >NUL 2>&1
if "%ERRORLEVEL%" == "0" goto execute

echo.
echo ERROR: JAVA_HOME is not set and no 'java' command could be found in your PATH.
echo.
echo Please set the JAVA_HOME variable in your environment to match the
echo location of your Java installation.

goto fail

:findJavaFromJavaHome
set JAVA_HOME=%JAVA_HOME:"=%
set JAVA_EXE=%JAVA_HOME%/bin/java.exe

if exist "%JAVA_EXE%" goto execute

echo.
echo ERROR: JAVA_HOME is set to an invalid directory: %JAVA_HOME%
echo.
echo Please set the JAVA_HOME variable in your environment to match the
echo location of your Java installation.

goto fail

:execute
@rem Setup the command line

set CLASSPATH=%APP_HOME%\\gradle\\wrapper\\gradle-wrapper.jar


@rem Execute Gradle
"%JAVA_EXE%" %DEFAULT_JVM_OPTS% %JAVA_OPTS% %GRADLE_OPTS% "-Dorg.gradle.appname=%APP_BASE_NAME%" -classpath "%CLASSPATH%" org.gradle.wrapper.GradleWrapperMain %*

:end
@rem End local scope for the variables with windows NT shell
if "%ERRORLEVEL%"=="0" goto mainEnd

:fail
rem Set variable GRADLE_EXIT_CONSOLE if you need the _script_ return code instead of
rem having the terminal window close on error.
if  not "" == "%GRADLE_EXIT_CONSOLE%" exit 1
exit /b 1

:mainEnd
if "%OS%"=="Windows_NT" endlocal

:omega
`
  await fs.writeFile(path.join(pluginPath, 'gradlew.bat'), gradlewBat, 'utf-8')

  // gradle-wrapper.properties
  const gradleWrapperProperties = `distributionBase=GRADLE_USER_HOME
distributionPath=wrapper/dists
distributionUrl=https\\://services.gradle.org/distributions/gradle-8.10-bin.zip
zipStoreBase=GRADLE_USER_HOME
zipStorePath=wrapper/dists
`
  await fs.writeFile(path.join(gradleWrapperPath, 'gradle-wrapper.properties'), gradleWrapperProperties, 'utf-8')

  // Download gradle-wrapper.jar (or create a placeholder that will auto-download)
  // For simplicity, we'll create a minimal README explaining to run gradle wrapper
  const gradleWrapperReadme = `# Gradle Wrapper

The gradle-wrapper.jar file will be downloaded automatically when you first run:

    ./gradlew build    (Linux/Mac)
    gradlew.bat build  (Windows)

Or you can download it manually from:
https://github.com/gradle/gradle/tree/master/gradle/wrapper
`
  await fs.writeFile(path.join(gradleWrapperPath, 'README.md'), gradleWrapperReadme, 'utf-8')

  // manifest.json
  const manifest = {
    Group: group.split('.').pop() || safeName,
    Name: pluginName,
    Version: version,
    Description: options.description?.trim() || `A Hytale plugin created with Hymn.`,
    Authors: options.authorName?.trim() ? [{ Name: options.authorName.trim() }] : [{ Name: 'Unknown' }],
    Website: '',
    ServerVersion: '*',
    Dependencies: {},
    OptionalDependencies: {},
    DisabledByDefault: false,
    Main: fullMainClass,
    IncludesAssetPack: includesAssetPack,
  }
  const manifestPath = path.join(resourcesPath, 'manifest.json')
  await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 4), 'utf-8')

  // Main Java class
  const mainJavaClass = `package ${group};

import com.hypixel.hytale.logger.HytaleLogger;
import com.hypixel.hytale.server.core.plugin.JavaPlugin;
import com.hypixel.hytale.server.core.plugin.JavaPluginInit;

import javax.annotation.Nonnull;

/**
 * Main entry point for the ${pluginName} plugin.
 * Use the setup method to register commands, event listeners, and other game hooks.
 */
public class ${mainClassName} extends JavaPlugin {

    private static final HytaleLogger LOGGER = HytaleLogger.forEnclosingClass();

    public ${mainClassName}(@Nonnull JavaPluginInit init) {
        super(init);
        LOGGER.atInfo().log("${pluginName} v" + this.getManifest().getVersion().toString() + " loaded!");
    }

    @Override
    protected void setup() {
        LOGGER.atInfo().log("Setting up ${pluginName}...");

        // Register your commands here:
        // this.getCommandRegistry().registerCommand(new MyCommand());

        // Register event listeners here:
        // this.getEventRegistry().registerListener(new MyEventListener());
    }
}
`
  const mainClassPath = path.join(javaSourcePath, `${mainClassName}.java`)
  await fs.writeFile(mainClassPath, mainJavaClass, 'utf-8')

  return {
    success: true,
    path: pluginPath,
    manifestPath,
    mainClassPath,
  }
}

// ============================================================================
// JAVA CLASS TEMPLATE BUILDERS
// ============================================================================

type JavaClassTemplateBuilder = (packageName: string, className: string) => string

const JAVA_CLASS_TEMPLATE_BUILDERS: Record<JavaClassTemplate, JavaClassTemplateBuilder> = {
  command: (packageName, className) => {
    const commandName = className.replace(/Command$/i, '').toLowerCase()
    return `package ${packageName};

import com.hypixel.hytale.server.core.command.ArgumentReader;
import com.hypixel.hytale.server.core.command.ChatContext;
import com.hypixel.hytale.server.core.command.Command;
import com.hypixel.hytale.server.core.command.CommandResult;

import javax.annotation.Nonnull;

/**
 * A chat command handler for "/${commandName}".
 */
public class ${className} implements Command {

    @Nonnull
    @Override
    public String getName() {
        return "${commandName}";
    }

    @Nonnull
    @Override
    public CommandResult execute(@Nonnull ChatContext context, @Nonnull ArgumentReader args) {
        context.sendMessage("Hello from ${className}!");
        return CommandResult.success();
    }
}
`
  },

  event_listener: (packageName, className) => {
    return `package ${packageName};

import com.hypixel.hytale.server.core.event.EventListener;
import com.hypixel.hytale.server.core.event.player.PlayerJoinEvent;

import javax.annotation.Nonnull;

/**
 * Listens for game events and handles them.
 */
public class ${className} implements EventListener {

    @Override
    public void onPlayerJoin(@Nonnull PlayerJoinEvent event) {
        // Called when a player joins the server
    }
}
`
  },

  component: (packageName, className) => {
    return `package ${packageName};

import com.hypixel.hytale.server.core.entity.component.EntityComponent;

/**
 * A custom entity component.
 */
public class ${className} extends EntityComponent {

    @Override
    protected void onAttach() {
        // Called when this component is attached to an entity
    }

    @Override
    protected void onDetach() {
        // Called when this component is detached from an entity
    }
}
`
  },

  custom_class: (packageName, className) => {
    return `package ${packageName};

/**
 * ${className}
 */
public class ${className} {

    public ${className}() {
        // Constructor
    }
}
`
  },
}

async function extractPluginPackageInfo(projectPath: string): Promise<{ basePackage: string; sourceRoot: string } | null> {
  const resourcesManifestPath = path.join(projectPath, 'src', 'main', 'resources', 'manifest.json')

  if (!(await pathExists(resourcesManifestPath))) {
    return null
  }

  try {
    const content = await fs.readFile(resourcesManifestPath, 'utf-8')
    const manifest = JSON.parse(content) as Record<string, unknown>
    const mainClass = manifest.Main as string | undefined

    if (!mainClass) {
      return null
    }

    // Extract package from Main class (e.g., "com.example.MyPlugin" -> "com.example")
    const lastDot = mainClass.lastIndexOf('.')
    const basePackage = lastDot > 0 ? mainClass.substring(0, lastDot) : mainClass

    const sourceRoot = path.join(projectPath, 'src', 'main', 'java')
    return { basePackage, sourceRoot }
  } catch {
    return null
  }
}

async function listJavaSources(options: ListJavaSourcesOptions): Promise<ListJavaSourcesResult> {
  const packageInfo = await extractPluginPackageInfo(options.projectPath)

  if (!packageInfo) {
    return { sources: [], basePackage: '', sourceRoot: '' }
  }

  const { basePackage, sourceRoot } = packageInfo
  const sources: JavaSourceFile[] = []

  async function scanDirectory(dirPath: string, packagePrefix: string) {
    if (!(await pathExists(dirPath))) {
      return
    }

    const entries = await fs.readdir(dirPath, { withFileTypes: true })

    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name)

      if (entry.isDirectory()) {
        const subPackage = packagePrefix ? `${packagePrefix}.${entry.name}` : entry.name
        await scanDirectory(fullPath, subPackage)
      } else if (entry.isFile() && entry.name.endsWith('.java')) {
        const className = entry.name.replace(/\.java$/, '')
        const relativePath = path.relative(sourceRoot, fullPath).replace(/\\/g, '/')

        sources.push({
          id: relativePath,
          name: entry.name,
          className,
          packageName: packagePrefix || basePackage,
          relativePath,
          absolutePath: fullPath,
        })
      }
    }
  }

  // Start scanning from the base package directory
  const basePackagePath = path.join(sourceRoot, basePackage.replace(/\./g, '/'))
  await scanDirectory(basePackagePath, basePackage)

  // Sort by package name, then class name
  sources.sort((a, b) => {
    const pkgCompare = a.packageName.localeCompare(b.packageName)
    if (pkgCompare !== 0) return pkgCompare
    return a.className.localeCompare(b.className)
  })

  return { sources, basePackage, sourceRoot }
}

async function createJavaClass(options: CreateJavaClassOptions): Promise<CreateJavaClassResult> {
  const packageInfo = await extractPluginPackageInfo(options.projectPath)

  if (!packageInfo) {
    throw new Error('Could not determine plugin package structure. Is this a valid plugin project?')
  }

  const { basePackage, sourceRoot } = packageInfo

  // Validate class name (PascalCase)
  if (!/^[A-Z][a-zA-Z0-9]*$/.test(options.className)) {
    throw new Error('Class name must be in PascalCase (e.g., MyClass, HelloCommand)')
  }

  // Build the full package name
  const fullPackage = options.packagePath
    ? `${basePackage}.${options.packagePath.replace(/\//g, '.')}`
    : basePackage

  // Build the file path
  const packageDir = path.join(sourceRoot, fullPackage.replace(/\./g, '/'))
  const filePath = path.join(packageDir, `${options.className}.java`)
  const relativePath = path.relative(sourceRoot, filePath).replace(/\\/g, '/')

  // Check if file already exists
  if (await pathExists(filePath)) {
    throw new Error(`A class named "${options.className}" already exists in package "${fullPackage}"`)
  }

  // Get the template builder
  const templateBuilder = JAVA_CLASS_TEMPLATE_BUILDERS[options.template]
  if (!templateBuilder) {
    throw new Error(`Unknown template: ${options.template}`)
  }

  // Generate the class content
  const content = templateBuilder(fullPackage, options.className)

  // Create the directory and write the file
  await ensureDir(packageDir)
  await fs.writeFile(filePath, content, 'utf-8')

  return {
    success: true,
    filePath,
    relativePath,
  }
}

async function deleteJavaClass(options: { projectPath: string; relativePath: string }): Promise<{ success: boolean }> {
  const sourceRoot = path.join(options.projectPath, 'src', 'main', 'java')
  const filePath = path.join(sourceRoot, options.relativePath)

  // Security check: ensure the path is within the source root
  if (!isWithinPath(filePath, sourceRoot)) {
    throw new Error('Invalid file path')
  }

  if (!(await pathExists(filePath))) {
    throw new Error('File not found')
  }

  await fs.unlink(filePath)
  return { success: true }
}

// ============================================================================
// END JAVA CLASS MANAGEMENT
// ============================================================================

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

  await restoreSnapshotFolder(path.join(snapshotRoot, 'mods'), getLocationPath(info, 'mods'))
  await restoreSnapshotFolder(path.join(snapshotRoot, 'packs'), getLocationPath(info, 'packs'))
  await restoreSnapshotFolder(path.join(snapshotRoot, 'earlyplugins'), getLocationPath(info, 'earlyplugins'))
  await restoreSnapshotFolder(path.join(snapshotRoot, 'disabled'), getDisabledRoot())

  return {
    snapshotId: backupId,
    restoredAt: new Date().toISOString(),
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
  }

  const state = await createProfile(modpackMeta.name || 'Imported Profile')
  const newProfile = state.profiles.find((p) => p.id === state.activeProfileId)
  if (!newProfile) {
    throw new Error('Failed to create profile.')
  }

  const scan = await scanMods()
  const knownModIds = new Set(scan.entries.map((e) => e.id))

  const validEnabledMods = modpackMeta.enabledMods.filter((id) => {
    if (!knownModIds.has(id)) {
      return false
    }
    return true
  })

  await updateProfile({
    ...newProfile,
    enabledMods: validEnabledMods,
  })

  return {
    success: true,
    profileId: newProfile.id,
    modCount: validEnabledMods.length,
  }
}

async function listProjectFiles(options: ListProjectFilesOptions): Promise<ListProjectFilesResult> {
  const rootPath = options.path
  if (!(await pathExists(rootPath))) {
    throw new Error('Project path not found.')
  }

  async function buildTree(currentPath: string, parentPath: string | null = null): Promise<FileNode> {
    const name = path.basename(currentPath)
    const stat = await fs.stat(currentPath)

    if (stat.isFile()) {
      return { name, type: 'file', path: currentPath, parentPath }
    }

    const node: FileNode = { name, type: 'directory', path: currentPath, parentPath, children: [] }

    if (options.recursive !== false) {
      const entries = await fs.readdir(currentPath, { withFileTypes: true })
      for (const entry of entries) {
        // Skip hidden and build folders
        if (entry.name.startsWith('.') || entry.name === 'build' || entry.name === 'node_modules') continue
        const childPath = path.join(currentPath, entry.name)
        node.children!.push(await buildTree(childPath, currentPath))
      }

      // Sort: directories first, then alphabetically
      node.children!.sort((a, b) => {
        if (a.type === b.type) return a.name.localeCompare(b.name)
        return a.type === 'directory' ? -1 : 1
      })
    }

    return node
  }

  return { root: await buildTree(rootPath) }
}

async function readFile(filePath: string): Promise<string> {
  if (!(await pathExists(filePath))) {
    throw new Error('File not found.')
  }
  return await fs.readFile(filePath, 'utf-8')
}

async function saveFile(filePath: string, content: string): Promise<{ success: boolean }> {
  await fs.writeFile(filePath, content, 'utf-8')
  return { success: true }
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

  ipcMain.handle('hymn:scan-mods', async (_event, worldId?: string) => scanModsWithWorld(worldId))
  // Legacy profile handlers (kept for backwards compatibility)
  ipcMain.handle('hymn:get-profiles', async () => getProfilesState())
  ipcMain.handle('hymn:create-profile', async (_event, name: string) => createProfile(name ?? ''))
  ipcMain.handle('hymn:update-profile', async (_event, profile: Profile) => updateProfile(profile))
  ipcMain.handle('hymn:set-active-profile', async (_event, profileId: string) => setActiveProfile(profileId))
  ipcMain.handle('hymn:apply-profile', async (_event, profileId: string) => applyProfile(profileId))
  ipcMain.handle('hymn:rollback-last-apply', async () => rollbackLastApply())
  // World management handlers
  ipcMain.handle('hymn:get-worlds', async () => getWorlds())
  ipcMain.handle('hymn:get-world-config', async (_event, worldId: string) => getWorldConfig(worldId))
  ipcMain.handle('hymn:set-mod-enabled', async (_event, options: SetModEnabledOptions) => setModEnabled(options))
  ipcMain.handle('hymn:set-selected-world', async (_event, worldId: string) => setSelectedWorld(worldId))
  // Mod management handlers
  ipcMain.handle('hymn:delete-mod', async (_event, options: DeleteModOptions) => deleteMod(options))
  ipcMain.handle('hymn:add-mods', async () => addMods())
  ipcMain.handle('hymn:create-pack', async (_event, options: CreatePackOptions) => createPack(options))
  ipcMain.handle('hymn:create-plugin', async (_event, options: CreatePluginOptions) => createPlugin(options))
  ipcMain.handle('hymn:get-mod-manifest', async (_event, options: ModManifestOptions) => getModManifest(options))
  ipcMain.handle('hymn:save-mod-manifest', async (_event, options: SaveManifestOptions) => saveModManifest(options))
  ipcMain.handle('hymn:list-mod-assets', async (_event, options: ModAssetsOptions) => listModAssets(options))
  ipcMain.handle('hymn:build-mod', async (_event, options: ModBuildOptions) => buildMod(options))
  ipcMain.handle('hymn:list-server-assets', async (_event, options: ServerAssetListOptions) => listServerAssets(options))
  ipcMain.handle('hymn:create-server-asset', async (_event, options: CreateServerAssetOptions) => createServerAsset(options))
  ipcMain.handle(
    'hymn:duplicate-server-asset',
    async (_event, options: DuplicateServerAssetOptions) => duplicateServerAsset(options),
  )
  ipcMain.handle('hymn:move-server-asset', async (_event, options: MoveServerAssetOptions) => moveServerAsset(options))
  ipcMain.handle(
    'hymn:delete-server-asset',
    async (_event, options: DeleteServerAssetOptions) => deleteServerAsset(options),
  )
  ipcMain.handle('hymn:list-vanilla-assets', async (_event, options: VanillaAssetListOptions) => listVanillaAssets(options))
  ipcMain.handle(
    'hymn:import-vanilla-asset',
    async (_event, options: ImportVanillaAssetOptions) => importVanillaAsset(options),
  )
  ipcMain.handle('hymn:get-backups', async () => getBackups())
  ipcMain.handle('hymn:restore-backup', async (_event, backupId: string) => restoreBackup(backupId))
  ipcMain.handle('hymn:delete-backup', async (_event, backupId: string) => deleteBackup(backupId))
  ipcMain.handle('hymn:export-modpack', async (_event, options: ExportModpackOptions) => exportModpack(options))
  ipcMain.handle('hymn:import-modpack', async () => importModpack())
  ipcMain.handle('hymn:open-in-explorer', async (_event, targetPath: string) => {
    await shell.openPath(targetPath)
  })
  ipcMain.handle('hymn:list-project-files', async (_event, options: ListProjectFilesOptions) => listProjectFiles(options))
  ipcMain.handle('hymn:read-file', async (_event, filePath: string) => readFile(filePath))
  ipcMain.handle('hymn:save-file', async (_event, filePath: string, content: string) => saveFile(filePath, content))
  ipcMain.handle('hymn:check-path-exists', async (_event, filePath: string) => pathExists(filePath))
  // Java source file management for plugins
  ipcMain.handle('hymn:list-java-sources', async (_event, options: ListJavaSourcesOptions) => listJavaSources(options))
  ipcMain.handle('hymn:create-java-class', async (_event, options: CreateJavaClassOptions) => createJavaClass(options))
  ipcMain.handle(
    'hymn:delete-java-class',
    async (_event, options: { projectPath: string; relativePath: string }) => deleteJavaClass(options),
  )
}
