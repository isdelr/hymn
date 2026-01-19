import fs from 'node:fs/promises'
import path from 'node:path'
import { dialog, shell } from 'electron'
import JSZip from 'jszip'
import { pathExists, ensureDir, copyPath, removePath } from '../utils/fileSystem'
import { getProjectsRoot } from '../core/paths'
import { resolveInstallInfo } from './InstallService'
import { scanSingleMod, readManifestFromFolder, findManifestPath } from './ModService'
import type {
  ProjectEntry,
  ListProjectsResult,
  DeleteProjectOptions,
  DeleteProjectResult,
  InstallProjectOptions,
  InstallProjectResult,
  UninstallProjectOptions,
  UninstallProjectResult,
  PackageModOptions,
  PackageModResult,
  ListProjectFilesOptions,
  ListProjectFilesResult,
  FileNode,
  CreatePackOptions,
  CreatePackResult,
  PackManifest,
  ListPackLanguagesOptions,
  ListPackLanguagesResult,
  PackLanguageInfo,
  GetPackTranslationsOptions,
  GetPackTranslationsResult,
  SavePackTranslationsOptions,
  SavePackTranslationsResult,
  CreatePackLanguageOptions,
  CreatePackLanguageResult,
} from '../../src/shared/hymn-types'

// Language code to display name mapping
const LANGUAGE_NAMES: Record<string, string> = {
  'en-US': 'English (US)',
  'en-GB': 'English (UK)',
  'es-ES': 'Spanish (Spain)',
  'es-MX': 'Spanish (Mexico)',
  'fr-FR': 'French',
  'de-DE': 'German',
  'it-IT': 'Italian',
  'pt-BR': 'Portuguese (Brazil)',
  'pt-PT': 'Portuguese (Portugal)',
  'ru-RU': 'Russian',
  'zh-CN': 'Chinese (Simplified)',
  'zh-TW': 'Chinese (Traditional)',
  'ja-JP': 'Japanese',
  'ko-KR': 'Korean',
  'pl-PL': 'Polish',
  'nl-NL': 'Dutch',
  'sv-SE': 'Swedish',
  'da-DK': 'Danish',
  'fi-FI': 'Finnish',
  'no-NO': 'Norwegian',
}

/**
 * List all projects (packs and plugins).
 */
export async function listProjects(): Promise<ListProjectsResult> {
  const info = await resolveInstallInfo()
  const projectsRoot = getProjectsRoot()
  const projects: ProjectEntry[] = []

  // Check installed paths (all installed in Mods folder)
  const installedPaths = new Set<string>()
  const modsPath = info.modsPath ?? (info.activePath ? path.join(info.activePath, 'UserData', 'Mods') : null)
  if (modsPath && await pathExists(modsPath)) {
    const modsEntries = await fs.readdir(modsPath, { withFileTypes: true })
    for (const entry of modsEntries) {
      if (entry.isDirectory()) {
        installedPaths.add(entry.name)
      }
    }
  }

  // Scan packs projects (installed to Mods folder)
  const packsProjectRoot = path.join(projectsRoot, 'packs')
  if (await pathExists(packsProjectRoot)) {
    const packEntries = await fs.readdir(packsProjectRoot, { withFileTypes: true })
    for (const entry of packEntries) {
      if (!entry.isDirectory()) continue
      const projectPath = path.join(packsProjectRoot, entry.name)
      const modEntry = await scanSingleMod(projectPath, 'directory', 'packs')
      if (modEntry) {
        const isInstalled = installedPaths.has(entry.name)
        const installedPath = isInstalled && modsPath
          ? path.join(modsPath, entry.name)
          : undefined
        projects.push({
          ...modEntry,
          isInstalled,
          installedPath,
        })
      }
    }
  }

  // Scan plugins projects
  const pluginsProjectRoot = path.join(projectsRoot, 'plugins')
  if (await pathExists(pluginsProjectRoot)) {
    const pluginEntries = await fs.readdir(pluginsProjectRoot, { withFileTypes: true })
    for (const entry of pluginEntries) {
      if (!entry.isDirectory()) continue
      const projectPath = path.join(pluginsProjectRoot, entry.name)
      const modEntry = await scanSingleMod(projectPath, 'directory', 'mods')
      if (modEntry) {
        const isInstalled = installedPaths.has(entry.name)
        const installedPath = isInstalled && info.activePath
          ? path.join(info.modsPath ?? path.join(info.activePath, 'UserData', 'Mods'), entry.name)
          : undefined
        projects.push({
          ...modEntry,
          isInstalled,
          installedPath,
        })
      }
    }
  }

  return { projects }
}

/**
 * Delete a project.
 */
export async function deleteProject(options: DeleteProjectOptions): Promise<DeleteProjectResult> {
  const { projectPath } = options

  try {
    // Verify the path is within our projects folder for safety
    const projectsRoot = getProjectsRoot()
    const normalizedPath = path.normalize(projectPath)
    const normalizedRoot = path.normalize(projectsRoot)

    if (!normalizedPath.startsWith(normalizedRoot)) {
      return { success: false, error: 'Cannot delete projects outside of the projects folder' }
    }

    // Check if path exists
    if (!(await pathExists(projectPath))) {
      return { success: false, error: 'Project path does not exist' }
    }

    // Delete the project directory recursively
    await fs.rm(projectPath, { recursive: true, force: true })

    return { success: true }
  } catch (err) {
    console.error('Failed to delete project:', err)
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' }
  }
}

/**
 * Install a project to the mods folder.
 */
export async function installProject(options: InstallProjectOptions): Promise<InstallProjectResult> {
  const { projectPath } = options
  const info = await resolveInstallInfo()
  if (!info.activePath) {
    throw new Error('Hytale install path not configured.')
  }

  if (!(await pathExists(projectPath))) {
    throw new Error('Project not found.')
  }

  const projectName = path.basename(projectPath)

  // Both packs and plugins go to Mods folder
  const targetRoot: string = info.modsPath ?? path.join(info.activePath, 'UserData', 'Mods')

  await ensureDir(targetRoot)
  const installedPath = path.join(targetRoot, projectName)

  if (await pathExists(installedPath)) {
    throw new Error(`A mod named "${projectName}" already exists at the installation location.`)
  }

  await copyPath(projectPath, installedPath)

  return {
    success: true,
    installedPath,
  }
}

/**
 * Uninstall a project (remove from mods folder).
 */
export async function uninstallProject(options: UninstallProjectOptions): Promise<UninstallProjectResult> {
  const { projectPath } = options

  if (!(await pathExists(projectPath))) {
    // Already uninstalled
    return { success: true }
  }

  await removePath(projectPath)

  return { success: true }
}

async function addDirectoryToZip(zipFolder: JSZip, dirPath: string): Promise<void> {
  const entries = await fs.readdir(dirPath, { withFileTypes: true })
  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name)
    if (entry.isDirectory()) {
      const subfolder = zipFolder.folder(entry.name)
      await addDirectoryToZip(subfolder!, fullPath)
    } else {
      const content = await fs.readFile(fullPath)
      zipFolder.file(entry.name, content)
    }
  }
}

/**
 * Package a mod as a zip file.
 */
export async function packageMod(options: PackageModOptions): Promise<PackageModResult> {
  const { path: modPath } = options

  if (!(await pathExists(modPath))) {
    throw new Error('Mod path not found.')
  }

  const modName = path.basename(modPath)
  const zip = new JSZip()

  // Add all mod contents to zip
  await addDirectoryToZip(zip, modPath)

  // Determine output path
  let outputPath = options.outputPath
  if (!outputPath) {
    const result = await dialog.showSaveDialog({
      title: 'Package Mod',
      defaultPath: `${modName}.zip`,
      filters: [{ name: 'Zip Archive', extensions: ['zip'] }],
    })

    if (result.canceled || !result.filePath) {
      throw new Error('Packaging cancelled.')
    }
    outputPath = result.filePath
  }

  const zipContent = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' })
  await fs.writeFile(outputPath, zipContent)

  return {
    success: true,
    outputPath,
  }
}

/**
 * List project files recursively.
 */
export async function listProjectFiles(options: ListProjectFilesOptions): Promise<ListProjectFilesResult> {
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

/**
 * Read a file.
 */
export async function readFile(filePath: string): Promise<string> {
  if (!(await pathExists(filePath))) {
    throw new Error('File not found.')
  }
  return await fs.readFile(filePath, 'utf-8')
}

/**
 * Save a file.
 */
export async function saveFile(filePath: string, content: string): Promise<{ success: boolean }> {
  await fs.writeFile(filePath, content, 'utf-8')
  return { success: true }
}

/**
 * Open a path in the system file explorer.
 */
export async function openInExplorer(targetPath: string): Promise<void> {
  await shell.openPath(targetPath)
}

/**
 * Open a path in the default editor.
 */
export async function openInEditor(targetPath: string): Promise<void> {
  const { exec } = await import('node:child_process')
  const { promisify } = await import('node:util')
  const execAsync = promisify(exec)

  const platform = process.platform
  try {
    if (platform === 'win32') {
      await execAsync(`explorer "${targetPath}"`)
    } else if (platform === 'darwin') {
      await execAsync(`open "${targetPath}"`)
    } else {
      await execAsync(`xdg-open "${targetPath}"`)
    }
  } catch {
    // Fallback to shell.openPath
    await shell.openPath(targetPath)
  }
}

// ===== Pack Creation =====

/**
 * Create a new asset pack.
 */
export async function createPack(options: CreatePackOptions): Promise<CreatePackResult> {
  const packName = options.name.trim() || 'NewPack'
  const safeName = packName.replace(/[^a-zA-Z0-9_-]/g, '_')

  // Create packs in projects folder
  const projectsRoot = getProjectsRoot()
  const packsProjectRoot = path.join(projectsRoot, 'packs')
  await ensureDir(packsProjectRoot)

  const packPath = path.join(packsProjectRoot, safeName)
  if (await pathExists(packPath)) {
    throw new Error(`A pack named "${safeName}" already exists.`)
  }

  await ensureDir(packPath)

  // Create folder structure matching Hytale conventions
  if (options.includeCommon !== false) {
    await ensureDir(path.join(packPath, 'Common'))
    await ensureDir(path.join(packPath, 'Common', 'Icons', 'ItemsGenerated'))
    await ensureDir(path.join(packPath, 'Common', 'Items'))
    await ensureDir(path.join(packPath, 'Common', 'Blocks'))
  }

  if (options.includeServer !== false) {
    await ensureDir(path.join(packPath, 'Server'))
    await ensureDir(path.join(packPath, 'Server', 'Item', 'Items'))
    await ensureDir(path.join(packPath, 'Server', 'Languages', 'en-US'))
  }

  // Build manifest with all required fields for Hytale compatibility
  const manifest: PackManifest = {
    Group: options.group?.trim() || safeName,
    Name: packName,
    Version: options.version?.trim() || '1.0.0',
    Description: options.description?.trim() || '',
    Authors: options.authorName?.trim()
      ? [{ Name: options.authorName.trim(), Email: options.authorEmail?.trim() || '', Url: '' }]
      : [],
    Website: '',
    ServerVersion: '*',
    Dependencies: {},
    OptionalDependencies: {},
    DisabledByDefault: false,
  }

  const manifestPath = path.join(packPath, 'manifest.json')
  await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2), 'utf-8')

  if (options.includeServer !== false) {
    // Create empty language file - translations will be added via TranslationsEditor
    const langContent = `# ${packName} translations\n# Format: items.ItemId.name = Display Name\n`
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

// ===== Pack Translations =====

/**
 * List all languages for a pack.
 */
export async function listPackLanguages(options: ListPackLanguagesOptions): Promise<ListPackLanguagesResult> {
  const languagesDir = path.join(options.packPath, 'Server', 'Languages')

  if (!(await pathExists(languagesDir))) {
    return { languages: [] }
  }

  const entries = await fs.readdir(languagesDir, { withFileTypes: true })
  const languages: PackLanguageInfo[] = []

  for (const entry of entries) {
    if (!entry.isDirectory()) continue

    const langCode = entry.name
    const langFile = path.join(languagesDir, langCode, 'server.lang')

    if (!(await pathExists(langFile))) continue

    const content = await fs.readFile(langFile, 'utf-8')
    // Count non-empty, non-comment lines
    const lines = content.split('\n').filter((line) => {
      const trimmed = line.trim()
      return trimmed && !trimmed.startsWith('#')
    })

    languages.push({
      code: langCode,
      name: LANGUAGE_NAMES[langCode] || langCode,
      filePath: langFile,
      entryCount: lines.length,
    })
  }

  return { languages }
}

/**
 * Get translations for a pack.
 */
export async function getPackTranslations(options: GetPackTranslationsOptions): Promise<GetPackTranslationsResult> {
  const langFile = path.join(options.packPath, 'Server', 'Languages', options.langCode, 'server.lang')

  if (!(await pathExists(langFile))) {
    throw new Error(`Language file not found: ${options.langCode}`)
  }

  const content = await fs.readFile(langFile, 'utf-8')
  const translations: Record<string, string> = {}

  for (const line of content.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue

    // Parse key = value format
    const eqIndex = trimmed.indexOf('=')
    if (eqIndex === -1) continue

    const key = trimmed.slice(0, eqIndex).trim()
    const value = trimmed.slice(eqIndex + 1).trim()

    if (key) {
      translations[key] = value
    }
  }

  return { translations, filePath: langFile }
}

/**
 * Save translations for a pack.
 */
export async function savePackTranslations(options: SavePackTranslationsOptions): Promise<SavePackTranslationsResult> {
  const langFile = path.join(options.packPath, 'Server', 'Languages', options.langCode, 'server.lang')
  const langDir = path.dirname(langFile)

  await ensureDir(langDir)

  // Build content with sorted keys for consistency
  const lines: string[] = [
    '# Translations file',
    '# Format: key = value',
    '',
  ]

  const sortedKeys = Object.keys(options.translations).sort()
  for (const key of sortedKeys) {
    lines.push(`${key} = ${options.translations[key]}`)
  }

  await fs.writeFile(langFile, lines.join('\n') + '\n', 'utf-8')

  return { success: true }
}

/**
 * Create a new language for a pack.
 */
export async function createPackLanguage(options: CreatePackLanguageOptions): Promise<CreatePackLanguageResult> {
  const langDir = path.join(options.packPath, 'Server', 'Languages', options.langCode)
  const langFile = path.join(langDir, 'server.lang')

  if (await pathExists(langFile)) {
    throw new Error(`Language "${options.langCode}" already exists`)
  }

  await ensureDir(langDir)

  // Create empty language file with header
  const content = `# ${LANGUAGE_NAMES[options.langCode] || options.langCode} translations\n# Format: key = value\n`
  await fs.writeFile(langFile, content, 'utf-8')

  return { success: true, filePath: langFile }
}

// ===== Mod Manifest =====

/**
 * Get mod manifest.
 */
export async function getModManifest(options: { path: string }): Promise<Record<string, unknown> | null> {
  return readManifestFromFolder(options.path)
}

/**
 * Save mod manifest.
 */
export async function saveModManifest(options: { path: string; manifest: Record<string, unknown> }): Promise<{ success: boolean }> {
  // Find manifest path
  const manifestPath = await findManifestPath(options.path)

  if (!manifestPath) {
    // Create new manifest at root
    const newPath = path.join(options.path, 'manifest.json')
    await fs.writeFile(newPath, JSON.stringify(options.manifest, null, 2), 'utf-8')
  } else {
    await fs.writeFile(manifestPath, JSON.stringify(options.manifest, null, 2), 'utf-8')
  }

  return { success: true }
}

/**
 * List mod assets (files in the mod folder).
 */
export async function listModAssets(options: { path: string }): Promise<{ assets: string[] }> {
  const assets: string[] = []

  async function walk(dir: string) {
    const entries = await fs.readdir(dir, { withFileTypes: true })
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name)
      if (entry.isDirectory()) {
        await walk(fullPath)
      } else {
        const relativePath = path.relative(options.path, fullPath).replace(/\\/g, '/')
        assets.push(relativePath)
      }
    }
  }

  await walk(options.path)
  return { assets }
}
