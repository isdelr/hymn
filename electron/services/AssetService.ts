import fs from 'node:fs/promises'
import path from 'node:path'
import type { Dirent } from 'node:fs'
import { createWriteStream } from 'node:fs'
import { pipeline } from 'node:stream/promises'
import type { ZipFile, Entry } from 'yauzl'
import { pathExists, ensureDir, normalizeRelativePath, movePath } from '../utils/fileSystem'

// Lazy-loaded yauzl for better startup performance
let yauzlModule: typeof import('yauzl') | null = null

async function getYauzl() {
  if (!yauzlModule) {
    yauzlModule = await import('yauzl')
  }
  return yauzlModule
}
import { ensureSafeRelativePath, ensureServerRelativePath, isWithinPath } from '../utils/security'
import { SERVER_ASSET_TEMPLATE_BUILDERS, UI_FILE_TEMPLATE_BUILDERS, isUiFileTemplate, getTemplateFileExtension, normalizeAssetId, formatAssetLabel } from '../templates/serverAssetBuilders'
import { resolveInstallInfo } from './InstallService'
import type {
  ServerAsset,
  ServerAssetListOptions,
  ServerAssetListResult,
  CreateServerAssetOptions,
  ServerAssetMutationResult,
  DuplicateServerAssetOptions,
  MoveServerAssetOptions,
  DeleteServerAssetOptions,
  DeleteServerAssetResult,
  VanillaAssetEntry,
  VanillaAssetListOptions,
  VanillaAssetListResult,
  ImportVanillaAssetOptions,
  ImportVanillaAssetResult,
} from '../../src/shared/hymn-types'

const DEFAULT_MAX_SERVER_ASSETS = 20_000
const DEFAULT_MAX_VANILLA_ASSETS = 10_000
const DEFAULT_MAX_VANILLA_ROOTS = 10
const MAX_VANILLA_SCAN_DEPTH = 2

// Module-level state for vanilla zip caching
interface VanillaZipState {
  zipPath: string | null
  zipfile: ZipFile | null
  entries: VanillaAssetEntry[]
  isComplete: boolean
  isReading: Promise<void> | null
}

const vanillaZipState: VanillaZipState = {
  zipPath: null,
  zipfile: null,
  entries: [],
  isComplete: false,
  isReading: null,
}

/**
 * Infer the asset kind from its relative path.
 */
function inferAssetKind(relativePath: string): ServerAsset['kind'] {
  const lowerPath = relativePath.toLowerCase()
  // Check more specific patterns first before broader ones
  // Hitboxes, groups, qualities, animations, interactions are within /item/ so check first
  if (lowerPath.includes('/hitbox') || lowerPath.includes('\\hitbox')) return 'hitbox'
  if (lowerPath.includes('/groups/') || lowerPath.includes('\\groups\\')) return 'group'
  if (lowerPath.includes('/qualities/') || lowerPath.includes('\\qualities\\')) return 'quality'
  if (lowerPath.includes('/animations/') || lowerPath.includes('\\animations\\')) return 'animation'
  if (lowerPath.includes('/interactions/') || lowerPath.includes('\\interactions\\')) return 'interaction'
  // Main asset types
  if (lowerPath.includes('/item/') || lowerPath.includes('\\item\\')) return 'item'
  if (lowerPath.includes('/block/') || lowerPath.includes('\\block\\')) return 'block'
  if (lowerPath.includes('/entity/') || lowerPath.includes('\\entity\\')) return 'entity'
  if (lowerPath.includes('/audio/') || lowerPath.includes('\\audio\\')) return 'audio'
  if (lowerPath.includes('/ui/') || lowerPath.includes('\\ui\\')) return 'ui'
  if (lowerPath.includes('/model/') || lowerPath.includes('\\model\\')) return 'model'
  if (lowerPath.includes('/texture/') || lowerPath.includes('\\texture\\')) return 'texture'
  if (lowerPath.includes('/script/') || lowerPath.includes('\\script\\')) return 'script'
  if (lowerPath.includes('/projectile/') || lowerPath.includes('\\projectile\\')) return 'projectile'
  if (lowerPath.includes('/drop') || lowerPath.includes('\\drop')) return 'drop'
  if (lowerPath.includes('/recipe/') || lowerPath.includes('\\recipe\\')) return 'recipe'
  if (lowerPath.includes('/barter/') || lowerPath.includes('\\barter\\')) return 'barter'
  if (lowerPath.includes('/prefab/') || lowerPath.includes('\\prefab\\')) return 'prefab'
  if (lowerPath.includes('/effect/') || lowerPath.includes('\\effect\\')) return 'effect'
  if (lowerPath.includes('/category/') || lowerPath.includes('\\category\\')) return 'category'
  if (lowerPath.includes('/particle/') || lowerPath.includes('\\particle\\')) return 'particle'
  return 'other'
}

/**
 * Build a ServerAsset entry from a file path.
 */
export async function buildServerAssetEntry(modRoot: string, fullPath: string): Promise<ServerAsset> {
  const relativePath = normalizeRelativePath(path.relative(modRoot, fullPath))
  const fileName = path.basename(fullPath)
  const stat = await fs.stat(fullPath)
  const name = formatAssetLabel(fileName)
  const kind = inferAssetKind(relativePath)

  return {
    id: relativePath,
    name,
    relativePath,
    absolutePath: fullPath,
    kind,
    size: stat.size,
  }
}

/**
 * List server assets in a mod folder.
 */
export async function listServerAssets(options: ServerAssetListOptions): Promise<ServerAssetListResult> {
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
      const lowerName = entry.name.toLowerCase()
      // Include .json and .ui files
      if (!lowerName.endsWith('.json') && !lowerName.endsWith('.ui')) continue
      if (lowerName === 'manifest.json') continue
      try {
        const asset = await buildServerAssetEntry(options.path, fullPath)
        assets.push(asset)
      } catch {
        // Failed to read asset
      }
    }
  }

  await visitDirectory(serverRoot)

  assets.sort((a, b) => a.relativePath.localeCompare(b.relativePath))

  return { assets }
}

/**
 * Create a new server asset.
 */
export async function createServerAsset(options: CreateServerAssetOptions): Promise<ServerAssetMutationResult> {
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

  // Determine file extension based on template type
  const fileExtension = getTemplateFileExtension(options.template)
  const hasExtension = trimmedName.toLowerCase().endsWith('.json') || trimmedName.toLowerCase().endsWith('.ui')
  const rawFileName = hasExtension ? trimmedName : `${trimmedName}${fileExtension}`
  const fileName = rawFileName.replace(/[<>:"\\|?*]/g, '_')

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

  // Use UI file builder for .ui templates, otherwise use JSON builder
  if (isUiFileTemplate(options.template)) {
    const uiBuilder = UI_FILE_TEMPLATE_BUILDERS[options.template]
    if (uiBuilder) {
      const content = uiBuilder(assetId || 'ExamplePage', label || 'Example Page')
      await fs.writeFile(filePath, content, 'utf-8')
    }
  } else {
    const templateBuilder = SERVER_ASSET_TEMPLATE_BUILDERS[options.template] ?? SERVER_ASSET_TEMPLATE_BUILDERS.empty
    const template = templateBuilder(assetId || 'Example_Id', label || 'Example Asset')
    await fs.writeFile(filePath, JSON.stringify(template, null, 2), 'utf-8')
  }

  const asset = await buildServerAssetEntry(options.path, filePath)

  return { success: true, asset }
}

/**
 * Duplicate a server asset.
 */
export async function duplicateServerAsset(options: DuplicateServerAssetOptions): Promise<ServerAssetMutationResult> {
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

/**
 * Move a server asset.
 */
export async function moveServerAsset(options: MoveServerAssetOptions): Promise<ServerAssetMutationResult> {
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

/**
 * Delete a server asset.
 */
export async function deleteServerAsset(options: DeleteServerAssetOptions): Promise<DeleteServerAssetResult> {
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

// ===== Vanilla Asset Functions =====

function shouldSkipVanillaDirectory(name: string): boolean {
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

async function findVanillaAssetRoots(installPath: string, maxRoots: number): Promise<string[]> {
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

async function findAssetsZipPath(installPath: string): Promise<string | null> {
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

function resetVanillaZipState(zipPath: string): void {
  if (vanillaZipState.zipfile) {
    vanillaZipState.zipfile.close()
  }
  vanillaZipState.zipPath = zipPath
  vanillaZipState.zipfile = null
  vanillaZipState.entries = []
  vanillaZipState.isComplete = false
  vanillaZipState.isReading = null
}

async function openZipFile(zipPath: string): Promise<ZipFile> {
  const yauzl = await getYauzl()
  return await new Promise<ZipFile>((resolve, reject) => {
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

async function readNextZipEntry(zipfile: ZipFile): Promise<Entry | null> {
  return await new Promise<Entry | null>((resolve, reject) => {
    const handleEntry = (entry: Entry) => {
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

async function ensureVanillaZipEntries(zipPath: string, targetCount: number, maxAssets: number): Promise<void> {
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

/**
 * List vanilla assets from the Hytale installation.
 */
export async function listVanillaAssets(options: VanillaAssetListOptions): Promise<VanillaAssetListResult> {
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

  assets.sort((a, b) => a.relativePath.localeCompare(b.relativePath))

  const slicedAssets = assets.slice(offset, offset + limit)
  const nextOffset = offset + slicedAssets.length
  const hasMore = nextOffset < assets.length

  return { assets: slicedAssets, roots, hasMore, nextOffset }
}

async function extractZipEntry(archivePath: string, entryPath: string, destinationPath: string): Promise<void> {
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

    const handleEntry = (entry: Entry) => {
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

/**
 * Import a vanilla asset to a mod folder.
 */
export async function importVanillaAsset(options: ImportVanillaAssetOptions): Promise<ImportVanillaAssetResult> {
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
