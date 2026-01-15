import { app, BrowserWindow, dialog, ipcMain, shell } from 'electron'
import { spawn } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { createWriteStream } from 'node:fs'
import type { Dirent } from 'node:fs'
import fs from 'node:fs/promises'
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
  warnings: string[],
) {
  const configPath = await getActiveWorldConfigPath(userDataPath)
  if (!configPath) return
  try {
    await updateWorldModConfig(configPath, enabledSet, entries)
  } catch {
    const worldName = path.basename(path.dirname(configPath))
    warnings.push(`Failed to sync mod settings for world ${worldName}.`)
  }
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
  warnings: string[]
} = {
  zipPath: null,
  zipfile: null,
  entries: [],
  isComplete: false,
  isReading: null,
  warnings: [],
}

const SERVER_ASSET_TEMPLATE_BUILDERS: Record<ServerAssetTemplate, (id: string, label: string) => Record<string, unknown>> = {
  item: (id, _label) => ({
    PlayerAnimationsId: 'Item',
    Categories: ['Items.Misc'],
    MaxStack: 64,
    Icon: `Icons/ItemsGenerated/${id}.png`,
    Model: `Items/${id}.blockymodel`,
    Texture: `Items/${id}.png`,
    Scale: 1.0,
  }),
  block: (id, _label) => ({
    PlayerAnimationsId: 'Block',
    Categories: ['Blocks.Building'],
    MaxStack: 64,
    BlockType: id,
    Icon: `Icons/ItemsGenerated/${id}.png`,
    Model: `Blocks/${id}.blockymodel`,
    Texture: `Blocks/${id}.png`,
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

function resolveServerAssetKind(relativePath: string): ServerAssetKind {
  const lowered = relativePath.toLowerCase()
  if (lowered.includes('/item/items/')) return 'item'
  if (lowered.includes('/item/blocks/')) return 'block'
  if (lowered.includes('/item/category/')) return 'category'
  if (lowered.includes('/blocks/')) return 'block'
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
    kind: resolveServerAssetKind(relativePath),
    size: stat.size,
  }
}

async function findManifestPath(folderPath: string) {
  const rootManifest = path.join(folderPath, 'manifest.json')
  if (await pathExists(rootManifest)) return rootManifest
  const serverManifest = path.join(folderPath, 'Server', 'manifest.json')
  if (await pathExists(serverManifest)) return serverManifest
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
  const warnings: string[] = []
  const maxAssets = options.maxAssets ?? DEFAULT_MAX_ASSETS
  const includePreviews = options.includePreviews !== false
  const maxPreviews = options.maxPreviews ?? DEFAULT_MAX_PREVIEWS
  const maxPreviewBytes = options.maxPreviewBytes ?? DEFAULT_MAX_PREVIEW_BYTES
  let previewCount = 0

  if (!(await pathExists(options.path))) {
    return { assets, warnings: ['Mod folder not found.'] }
  }

  let rootEntries: string[] = []
  try {
    rootEntries = await fs.readdir(options.path)
  } catch {
    return { assets, warnings: ['Unable to read mod folder.'] }
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
        warnings.push(`Failed to read ${relativePath}.`)
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
    warnings.push(`Asset list capped at ${maxAssets} items.`)
  }

  return { assets, warnings }
}

async function listAssetsFromArchive(options: ModAssetsOptions): Promise<ModAssetsResult> {
  const assets: ModAsset[] = []
  const warnings: string[] = []
  const maxAssets = options.maxAssets ?? DEFAULT_MAX_ASSETS
  const includePreviews = options.includePreviews !== false
  const maxPreviews = options.maxPreviews ?? DEFAULT_MAX_PREVIEWS
  const maxPreviewBytes = options.maxPreviewBytes ?? DEFAULT_MAX_PREVIEW_BYTES
  let previewCount = 0

  if (!(await pathExists(options.path))) {
    return { assets, warnings: ['Mod archive not found.'] }
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
    warnings.push(`Asset list capped at ${maxAssets} items.`)
  }

  return { assets, warnings }
}

async function listModAssets(options: ModAssetsOptions): Promise<ModAssetsResult> {
  if (options.format === 'directory') {
    return listAssetsFromDirectory(options)
  }
  return listAssetsFromArchive(options)
}

async function getModManifest(options: ModManifestOptions): Promise<ModManifestResult> {
  const warnings: string[] = []
  if (options.format !== 'directory') {
    const result = await readManifestFromArchive(options.path)
    if (!result.manifest) {
      return {
        manifestPath: result.manifestPath,
        content: null,
        warnings: ['manifest.json not found in archive.'],
        readOnly: true,
      }
    }
    return {
      manifestPath: result.manifestPath,
      content: JSON.stringify(result.manifest, null, 2),
      warnings,
      readOnly: true,
    }
  }

  if (!(await pathExists(options.path))) {
    return {
      manifestPath: null,
      content: null,
      warnings: ['Mod folder not found.'],
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
        warnings,
        readOnly: false,
      }
    }
  } catch {
    warnings.push('Failed to read manifest.json.')
  }

  warnings.push('manifest.json not found; saving will create a new file.')

  return {
    manifestPath,
    content: null,
    warnings,
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

  const warnings: string[] = []
  let parsed: Record<string, unknown>
  try {
    parsed = JSON.parse(options.content) as Record<string, unknown>
  } catch {
    throw new Error('Manifest JSON is invalid.')
  }

  const manifestPath = (await findManifestPath(options.path)) ?? path.join(options.path, 'manifest.json')
  await ensureDir(path.dirname(manifestPath))
  await fs.writeFile(manifestPath, JSON.stringify(parsed, null, 2), 'utf-8')

  return { success: true, warnings }
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
  const warnings: string[] = []
  const maxAssets = options.maxAssets ?? DEFAULT_MAX_SERVER_ASSETS

  if (!(await pathExists(options.path))) {
    return { assets, warnings: ['Mod folder not found.'] }
  }

  const stat = await fs.stat(options.path)
  if (!stat.isDirectory()) {
    return { assets, warnings: ['Mod path must be a folder.'] }
  }

  const serverRoot = path.join(options.path, 'Server')
  if (!(await pathExists(serverRoot))) {
    return { assets, warnings: ['Server folder not found.'] }
  }

  const visitDirectory = async (directory: string) => {
    let entries: Dirent[] = []
    try {
      entries = await fs.readdir(directory, { withFileTypes: true })
    } catch {
      warnings.push(`Unable to read ${normalizeRelativePath(path.relative(options.path, directory))}.`)
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
        warnings.push(`Failed to read ${normalizeRelativePath(path.relative(options.path, fullPath))}.`)
      }
    }
  }

  await visitDirectory(serverRoot)

  if (assets.length >= maxAssets) {
    warnings.push(`Server asset list capped at ${maxAssets} files.`)
  }

  assets.sort((a, b) => a.relativePath.localeCompare(b.relativePath))

  return { assets, warnings }
}

async function createServerAsset(options: CreateServerAssetOptions): Promise<ServerAssetMutationResult> {
  const warnings: string[] = []

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
    warnings.push('Invalid filename characters were replaced with underscores.')
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

  return { success: true, asset, warnings }
}

async function duplicateServerAsset(options: DuplicateServerAssetOptions): Promise<ServerAssetMutationResult> {
  const warnings: string[] = []
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

  return { success: true, asset, warnings }
}

async function moveServerAsset(options: MoveServerAssetOptions): Promise<ServerAssetMutationResult> {
  const warnings: string[] = []
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

  return { success: true, asset, warnings }
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
  vanillaZipState.warnings = []
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
        vanillaZipState.warnings.push(`Vanilla asset list capped at ${maxAssets} files.`)
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

  const warnings: string[] = []
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
      vanillaZipState.warnings.push('Assets.zip contained no files.')
    }
    const slice = vanillaZipState.entries.slice(offset, offset + limit)
    const nextOffset = offset + slice.length
    const hasMore = nextOffset < vanillaZipState.entries.length || !vanillaZipState.isComplete
    return {
      assets: slice,
      warnings: vanillaZipState.warnings,
      roots: [assetsZipPath],
      hasMore,
      nextOffset,
    }
  }

  const roots = await findVanillaAssetRoots(info.activePath, maxRoots)
  if (roots.length === 0) {
    warnings.push('No vanilla asset folders detected under the install path.')
    return { assets, warnings, roots, hasMore: false, nextOffset: offset }
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
        warnings.push(`Failed to read ${entry.name}.`)
      }
    }
  }

  for (const root of roots) {
    if (assets.length >= maxAssets) break
    await visitDirectory(root, root)
  }

  if (assets.length >= maxAssets) {
    warnings.push(`Vanilla asset list capped at ${maxAssets} files.`)
  }

  assets.sort((a, b) => a.relativePath.localeCompare(b.relativePath))

  const slicedAssets = assets.slice(offset, offset + limit)
  const nextOffset = offset + slicedAssets.length
  const hasMore = nextOffset < assets.length

  return { assets: slicedAssets, warnings, roots, hasMore, nextOffset }
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
  const warnings: string[] = []

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

  return { success: true, asset, warnings }
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
  enabledOverrides?: Map<string, boolean>
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
  const id = group ? `${group}:${name}` : name
  const overrideValue = params.enabledOverrides?.get(id)
  const enabled =
    typeof params.enabledOverride === 'boolean'
      ? params.enabledOverride
      : typeof overrideValue === 'boolean'
        ? overrideValue
        : disabledByDefaultValue === true
          ? false
          : true

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

async function scanPacksFolder(
  packsPath: string,
  warnings: string[],
  enabledOverride?: boolean,
  enabledOverrides?: Map<string, boolean>,
) {
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
      enabledOverrides,
      warnings: entryWarnings,
    })

    appendEntryWarnings(modEntry, warnings)
    mods.push(modEntry)
  }

  return mods
}

async function scanModsFolder(
  modsPath: string,
  warnings: string[],
  enabledOverride?: boolean,
  enabledOverrides?: Map<string, boolean>,
) {
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
        enabledOverrides,
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
      enabledOverrides,
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
  enabledOverrides?: Map<string, boolean>,
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
      enabledOverrides,
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
  const worldOverrides = await readActiveWorldModOverrides(info.userDataPath)

  if (info.packsPath) {
    entries.push(...(await scanPacksFolder(info.packsPath, warnings, undefined, worldOverrides ?? undefined)))
  } else {
    warnings.push('Packs folder not found.')
  }

  if (await pathExists(disabledPaths.packs)) {
    entries.push(...(await scanPacksFolder(disabledPaths.packs, warnings, false, worldOverrides ?? undefined)))
  }

  if (info.modsPath) {
    entries.push(...(await scanModsFolder(info.modsPath, warnings, undefined, worldOverrides ?? undefined)))
  } else {
    warnings.push('Mods folder not found.')
  }

  if (await pathExists(disabledPaths.mods)) {
    entries.push(...(await scanModsFolder(disabledPaths.mods, warnings, false, worldOverrides ?? undefined)))
  }

  if (info.earlyPluginsPath) {
    entries.push(...(await scanEarlyPluginsFolder(info.earlyPluginsPath, warnings, undefined, worldOverrides ?? undefined)))
  } else {
    warnings.push('Early plugins folder not found.')
  }

  if (await pathExists(disabledPaths.earlyplugins)) {
    entries.push(...(await scanEarlyPluginsFolder(disabledPaths.earlyplugins, warnings, false, worldOverrides ?? undefined)))
  }

  entries.sort((a, b) => a.name.localeCompare(b.name))

  await seedProfilesFromScan(entries)
  await syncDefaultProfileFromScan(entries)

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

  await syncActiveWorldModConfig(info.userDataPath, enabledSet, scan.entries, warnings)
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

  await updateProfile({
    ...newProfile,
    enabledMods: validEnabledMods,
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
}
