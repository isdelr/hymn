import fs from 'node:fs/promises'
import path from 'node:path'
import { randomUUID } from 'node:crypto'
import JSZip from 'jszip'
import { shell } from 'electron'
import { pathExists, ensureDir } from '../utils/fileSystem'
import { runCommand } from '../utils/command'
import { getBuildsRoot, getPluginBuildsRoot, getPackBuildsRoot } from '../core/paths'
import { readSetting, SETTINGS_KEYS } from '../core/database'
import { resolveInstallInfo } from './InstallService'
import type {
  BuildPluginOptions,
  BuildPluginResult,
  BuildPackOptions,
  BuildPackResult,
  BuildArtifact,
  BuildArtifactType,
  BuildArtifactListResult,
  DeleteBuildArtifactOptions,
  DeleteBuildArtifactResult,
  ClearAllBuildArtifactsResult,
  CopyArtifactToModsResult,
  InstalledModFile,
  ListInstalledModsResult,
} from '../../src/shared/hymn-types'

interface BuildMeta {
  projectName: string
  artifacts: BuildArtifact[]
}

/**
 * Load build metadata for a project.
 */
async function loadBuildMeta(projectDir: string): Promise<BuildMeta> {
  const metaPath = path.join(projectDir, 'build-meta.json')
  if (await pathExists(metaPath)) {
    try {
      const content = await fs.readFile(metaPath, 'utf-8')
      return JSON.parse(content) as BuildMeta
    } catch {
      // Failed to parse build-meta.json
    }
  }
  return { projectName: path.basename(projectDir), artifacts: [] }
}

/**
 * Save build metadata for a project.
 */
async function saveBuildMeta(projectDir: string, meta: BuildMeta): Promise<void> {
  const metaPath = path.join(projectDir, 'build-meta.json')
  await fs.writeFile(metaPath, JSON.stringify(meta, null, 2), 'utf-8')
}

/**
 * Add artifact to metadata (and prune old artifacts).
 */
async function addArtifactToMeta(
  projectDir: string,
  artifact: BuildArtifact,
  maxArtifacts = 10,
): Promise<void> {
  await ensureDir(projectDir)
  const meta = await loadBuildMeta(projectDir)

  meta.artifacts.push(artifact)

  // Keep only the latest N artifacts
  if (meta.artifacts.length > maxArtifacts) {
    const toRemove = meta.artifacts.slice(0, meta.artifacts.length - maxArtifacts)
    meta.artifacts = meta.artifacts.slice(-maxArtifacts)

    // Delete old artifact files
    for (const old of toRemove) {
      try {
        if (await pathExists(old.outputPath)) {
          await fs.unlink(old.outputPath)
        }
      } catch {
        // Ignore deletion errors
      }
    }
  }

  await saveBuildMeta(projectDir, meta)
}

/**
 * Remove an artifact from metadata.
 */
async function removeArtifactFromMeta(projectDir: string, artifactId: string): Promise<void> {
  const meta = await loadBuildMeta(projectDir)
  meta.artifacts = meta.artifacts.filter((a) => a.id !== artifactId)
  await saveBuildMeta(projectDir, meta)
}

/**
 * Build a plugin project.
 */
export async function buildPlugin(options: BuildPluginOptions): Promise<BuildPluginResult> {
  const { projectPath } = options

  if (!(await pathExists(projectPath))) {
    throw new Error('Plugin project not found.')
  }

  // Read manifest to get project info
  const manifestPath = path.join(projectPath, 'src', 'main', 'resources', 'manifest.json')
  let projectName = path.basename(projectPath)
  let version = '1.0.0'

  if (await pathExists(manifestPath)) {
    try {
      const content = await fs.readFile(manifestPath, 'utf-8')
      const manifest = JSON.parse(content) as Record<string, unknown>
      if (typeof manifest.Name === 'string') projectName = manifest.Name
      if (typeof manifest.Version === 'string') version = manifest.Version
    } catch {
      // Failed to read manifest
    }
  }

  // Read gradle.properties for version override
  const gradlePropsPath = path.join(projectPath, 'gradle.properties')
  if (await pathExists(gradlePropsPath)) {
    try {
      const propsContent = await fs.readFile(gradlePropsPath, 'utf-8')
      const versionMatch = propsContent.match(/^version\s*=\s*(.+)$/m)
      if (versionMatch) {
        version = versionMatch[1].trim()
      }
    } catch {
      // Ignore
    }
  }

  // Determine wrapper command
  const isWindows = process.platform === 'win32'
  const gradleCommand = isWindows ? 'gradlew.bat' : './gradlew'

  // Check for custom JDK path
  const customJdkPath = await readSetting(SETTINGS_KEYS.jdkPath)
  const managedJdkPath = await readSetting(SETTINGS_KEYS.managedJdkPath)

  // Set JAVA_HOME environment if custom path exists
  const env = { ...process.env }
  if (customJdkPath && (await pathExists(customJdkPath))) {
    env.JAVA_HOME = customJdkPath
    env.PATH = `${path.join(customJdkPath, 'bin')}${path.delimiter}${env.PATH}`
  } else if (managedJdkPath && (await pathExists(managedJdkPath))) {
    env.JAVA_HOME = managedJdkPath
    env.PATH = `${path.join(managedJdkPath, 'bin')}${path.delimiter}${env.PATH}`
  }

  // Run gradle build
  const result = await runCommand(gradleCommand, ['jar'], projectPath, env)

  if (result.exitCode !== 0) {
    return {
      success: false,
      exitCode: result.exitCode,
      output: result.output,
      durationMs: result.durationMs,
      truncated: result.truncated,
      artifact: null,
    }
  }

  // Find the built JAR
  const buildLibsDir = path.join(projectPath, 'build', 'libs')
  if (!(await pathExists(buildLibsDir))) {
    return {
      success: false,
      exitCode: 0,
      output: result.output + '\n\nBuild output directory not found.',
      durationMs: result.durationMs,
      truncated: result.truncated,
      artifact: null,
    }
  }

  const files = await fs.readdir(buildLibsDir)
  const jarFiles = files.filter((f) => f.endsWith('.jar') && !f.includes('sources'))
  if (jarFiles.length === 0) {
    return {
      success: false,
      exitCode: 0,
      output: result.output + '\n\nNo JAR file found in build output.',
      durationMs: result.durationMs,
      truncated: result.truncated,
      artifact: null,
    }
  }

  // Copy to builds folder
  const latestJar = jarFiles.sort().pop()!
  const sourceJar = path.join(buildLibsDir, latestJar)
  const buildsDir = path.join(getPluginBuildsRoot(), projectName)
  await ensureDir(buildsDir)

  // Determine build number from existing artifacts
  const meta = await loadBuildMeta(buildsDir)
  const existingCount = meta.artifacts.filter((a) => a.version === version).length
  const buildNumber = existingCount + 1

  const outputFileName = `${projectName}-${version}-build${buildNumber}.jar`
  const outputPath = path.join(buildsDir, outputFileName)
  await fs.copyFile(sourceJar, outputPath)

  const artifact: BuildArtifact = {
    id: randomUUID(),
    projectName,
    version,
    outputPath,
    builtAt: new Date().toISOString(),
    durationMs: result.durationMs,
    fileSize: (await fs.stat(outputPath)).size,
    artifactType: 'jar',
    output: result.output,
    outputTruncated: result.truncated,
  }

  await addArtifactToMeta(buildsDir, artifact)

  return {
    success: true,
    exitCode: result.exitCode,
    output: result.output,
    durationMs: result.durationMs,
    truncated: result.truncated,
    artifact,
  }
}

/**
 * Build a pack project.
 */
export async function buildPack(options: BuildPackOptions): Promise<BuildPackResult> {
  const { projectPath } = options

  if (!(await pathExists(projectPath))) {
    throw new Error('Pack project not found.')
  }

  // Read manifest
  let manifestPath = path.join(projectPath, 'manifest.json')
  if (!(await pathExists(manifestPath))) {
    manifestPath = path.join(projectPath, 'Server', 'manifest.json')
  }

  let projectName = path.basename(projectPath)
  let version = '1.0.0'

  if (await pathExists(manifestPath)) {
    try {
      const content = await fs.readFile(manifestPath, 'utf-8')
      const manifest = JSON.parse(content) as Record<string, unknown>
      if (typeof manifest.Name === 'string') projectName = manifest.Name
      if (typeof manifest.Version === 'string') version = manifest.Version
    } catch {
      // Failed to read manifest
    }
  }

  const startTime = Date.now()

  // Create zip
  const zip = new JSZip()

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

  await addDirectoryToZip(zip, projectPath)

  // Save to builds folder
  const buildsDir = path.join(getPackBuildsRoot(), projectName)
  await ensureDir(buildsDir)

  // Determine build number from existing artifacts
  const meta = await loadBuildMeta(buildsDir)
  const existingCount = meta.artifacts.filter((a) => a.version === version).length
  const buildNumber = existingCount + 1

  const outputFileName = `${projectName}-${version}-build${buildNumber}.zip`
  const outputPath = path.join(buildsDir, outputFileName)

  const zipContent = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' })
  await fs.writeFile(outputPath, zipContent)

  const durationMs = Date.now() - startTime

  const artifact: BuildArtifact = {
    id: randomUUID(),
    projectName,
    version,
    outputPath,
    builtAt: new Date().toISOString(),
    durationMs,
    fileSize: (await fs.stat(outputPath)).size,
    artifactType: 'zip',
    output: `Pack built successfully`,
  }

  await addArtifactToMeta(buildsDir, artifact)

  return {
    success: true,
    output: `Pack built successfully in ${durationMs}ms`,
    durationMs,
    artifact,
  }
}

/**
 * List all build artifacts.
 */
export async function listBuildArtifacts(): Promise<BuildArtifactListResult> {
  const artifacts: BuildArtifact[] = []

  // Scan plugins folder
  const pluginsRoot = getPluginBuildsRoot()
  if (await pathExists(pluginsRoot)) {
    const pluginDirs = await fs.readdir(pluginsRoot, { withFileTypes: true })
    for (const dir of pluginDirs) {
      if (!dir.isDirectory()) continue
      const projectDir = path.join(pluginsRoot, dir.name)
      const meta = await loadBuildMeta(projectDir)

      // Filter to only include artifacts that still exist
      for (const artifact of meta.artifacts) {
        if (await pathExists(artifact.outputPath)) {
          artifacts.push(artifact)
        }
      }
    }
  }

  // Scan packs folder
  const packsRoot = getPackBuildsRoot()
  if (await pathExists(packsRoot)) {
    const packDirs = await fs.readdir(packsRoot, { withFileTypes: true })
    for (const dir of packDirs) {
      if (!dir.isDirectory()) continue
      const projectDir = path.join(packsRoot, dir.name)
      const meta = await loadBuildMeta(projectDir)

      // Filter to only include artifacts that still exist
      for (const artifact of meta.artifacts) {
        if (await pathExists(artifact.outputPath)) {
          artifacts.push(artifact)
        }
      }
    }
  }

  // Sort by build date, newest first
  artifacts.sort((a, b) => new Date(b.builtAt).getTime() - new Date(a.builtAt).getTime())

  return { artifacts }
}

/**
 * Find an artifact by ID.
 */
export async function findArtifactById(
  artifactId: string,
): Promise<{ artifact: BuildArtifact; projectDir: string } | null> {
  // Search in plugins
  const pluginsRoot = getPluginBuildsRoot()
  if (await pathExists(pluginsRoot)) {
    const pluginDirs = await fs.readdir(pluginsRoot, { withFileTypes: true })
    for (const dir of pluginDirs) {
      if (!dir.isDirectory()) continue
      const projectDir = path.join(pluginsRoot, dir.name)
      const meta = await loadBuildMeta(projectDir)
      const artifact = meta.artifacts.find((a) => a.id === artifactId)
      if (artifact) {
        return { artifact, projectDir }
      }
    }
  }

  // Search in packs
  const packsRoot = getPackBuildsRoot()
  if (await pathExists(packsRoot)) {
    const packDirs = await fs.readdir(packsRoot, { withFileTypes: true })
    for (const dir of packDirs) {
      if (!dir.isDirectory()) continue
      const projectDir = path.join(packsRoot, dir.name)
      const meta = await loadBuildMeta(projectDir)
      const artifact = meta.artifacts.find((a) => a.id === artifactId)
      if (artifact) {
        return { artifact, projectDir }
      }
    }
  }

  return null
}

/**
 * Delete a build artifact.
 */
export async function deleteBuildArtifact(options: DeleteBuildArtifactOptions): Promise<DeleteBuildArtifactResult> {
  const found = await findArtifactById(options.artifactId)

  if (!found) {
    throw new Error('Artifact not found.')
  }

  const { artifact, projectDir } = found

  // Delete the file
  if (await pathExists(artifact.outputPath)) {
    await fs.unlink(artifact.outputPath)
  }

  // Remove from meta
  await removeArtifactFromMeta(projectDir, artifact.id)

  return { success: true }
}

/**
 * Clear all build artifacts.
 */
export async function clearAllBuildArtifacts(): Promise<ClearAllBuildArtifactsResult> {
  let deletedCount = 0

  // Clear plugins builds
  const pluginsRoot = getPluginBuildsRoot()
  if (await pathExists(pluginsRoot)) {
    const pluginProjects = await fs.readdir(pluginsRoot, { withFileTypes: true })
    for (const entry of pluginProjects) {
      if (entry.isDirectory()) {
        const projectDir = path.join(pluginsRoot, entry.name)
        // Delete all files in the project directory
        const files = await fs.readdir(projectDir)
        for (const file of files) {
          const filePath = path.join(projectDir, file)
          const stat = await fs.stat(filePath)
          if (stat.isFile() && (file.endsWith('.jar') || file === 'build-meta.json')) {
            if (file.endsWith('.jar')) deletedCount++
            await fs.unlink(filePath)
          }
        }
        // Remove empty directory
        const remaining = await fs.readdir(projectDir)
        if (remaining.length === 0) {
          await fs.rmdir(projectDir)
        }
      }
    }
  }

  // Clear packs builds
  const packsRoot = getPackBuildsRoot()
  if (await pathExists(packsRoot)) {
    const packProjects = await fs.readdir(packsRoot, { withFileTypes: true })
    for (const entry of packProjects) {
      if (entry.isDirectory()) {
        const projectDir = path.join(packsRoot, entry.name)
        // Delete all files in the project directory
        const files = await fs.readdir(projectDir)
        for (const file of files) {
          const filePath = path.join(projectDir, file)
          const stat = await fs.stat(filePath)
          if (stat.isFile() && (file.endsWith('.zip') || file === 'build-meta.json')) {
            if (file.endsWith('.zip')) deletedCount++
            await fs.unlink(filePath)
          }
        }
        // Remove empty directory
        const remaining = await fs.readdir(projectDir)
        if (remaining.length === 0) {
          await fs.rmdir(projectDir)
        }
      }
    }
  }

  return { success: true, deletedCount }
}

/**
 * Reveal a build artifact in the file explorer.
 */
export async function revealBuildArtifact(artifactId: string): Promise<void> {
  const found = await findArtifactById(artifactId)

  if (!found) {
    throw new Error('Artifact not found.')
  }

  await shell.showItemInFolder(found.artifact.outputPath)
}

// Parse artifact filename to extract project name, version, and build number
// Format: "ProjectName-Version-buildN.ext" or "ProjectName-Version.ext"
function parseArtifactFilename(filename: string): {
  projectName: string
  version: string
  buildNumber: number | null
  artifactType: BuildArtifactType
} | null {
  // Match patterns like "MyMod-1.0.0-build2.jar" or "MyMod-1.0.0.jar"
  const match = filename.match(/^(.+)-(\d+\.\d+\.\d+)(?:-build(\d+))?\.(jar|zip)$/i)
  if (!match) return null

  return {
    projectName: match[1],
    version: match[2],
    buildNumber: match[3] ? parseInt(match[3], 10) : null,
    artifactType: match[4].toLowerCase() as BuildArtifactType,
  }
}

/**
 * List installed mods (built artifacts in the mods folder).
 */
export async function listInstalledMods(): Promise<ListInstalledModsResult> {
  const installInfo = await resolveInstallInfo()
  const mods: InstalledModFile[] = []

  if (!installInfo.activePath) {
    return { mods }
  }

  // Check mods folder (both jars and zips are stored here)
  const modsFolder = installInfo.modsPath || path.join(installInfo.activePath, 'user', 'Mods')
  const foldersToCheck = [
    { folder: modsFolder, type: 'jar' as BuildArtifactType },
    { folder: modsFolder, type: 'zip' as BuildArtifactType },
  ]

  for (const { folder, type } of foldersToCheck) {
    if (!(await pathExists(folder))) continue

    const entries = await fs.readdir(folder, { withFileTypes: true })
    for (const entry of entries) {
      if (!entry.isFile()) continue

      const ext = path.extname(entry.name).toLowerCase()
      if ((type === 'jar' && ext !== '.jar') || (type === 'zip' && ext !== '.zip')) continue

      const parsed = parseArtifactFilename(entry.name)
      if (!parsed) continue

      const filePath = path.join(folder, entry.name)
      const stats = await fs.stat(filePath)

      mods.push({
        fileName: entry.name,
        filePath,
        projectName: parsed.projectName,
        version: parsed.version,
        buildNumber: parsed.buildNumber,
        artifactType: parsed.artifactType,
        installedAt: stats.mtime.toISOString(),
        fileSize: stats.size,
      })
    }
  }

  return { mods }
}

/**
 * Copy a build artifact to the mods folder.
 */
export async function copyArtifactToMods(artifactId: string): Promise<CopyArtifactToModsResult> {
  const found = await findArtifactById(artifactId)

  if (!found) {
    throw new Error('Artifact not found.')
  }

  const { artifact } = found

  // Get install info to find the mods/packs folder
  const installInfo = await resolveInstallInfo()

  if (!installInfo.activePath) {
    throw new Error('Hytale installation not found. Please configure install path in settings.')
  }

  // Both plugins (jar) and asset packs (zip) go to Mods folder
  const destFolder = installInfo.modsPath || path.join(installInfo.activePath, 'user', 'Mods')

  await ensureDir(destFolder)

  // Check for existing builds of the same project and remove them
  let replacedPath: string | undefined
  const entries = await fs.readdir(destFolder, { withFileTypes: true })
  for (const entry of entries) {
    if (!entry.isFile()) continue

    const parsed = parseArtifactFilename(entry.name)
    if (parsed && parsed.projectName === artifact.projectName) {
      const existingPath = path.join(destFolder, entry.name)
      await fs.unlink(existingPath)
      replacedPath = existingPath
      break // Only one build per project should exist
    }
  }

  const destPath = path.join(destFolder, path.basename(artifact.outputPath))
  await fs.copyFile(artifact.outputPath, destPath)

  return {
    success: true,
    destinationPath: destPath,
    replacedPath,
  }
}

/**
 * Open the builds folder in file explorer.
 */
export async function openBuildsFolder(): Promise<void> {
  const buildsRoot = getBuildsRoot()
  await ensureDir(buildsRoot)
  await shell.openPath(buildsRoot)
}
