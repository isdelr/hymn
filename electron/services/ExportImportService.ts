import fs from 'node:fs/promises'
import path from 'node:path'
import { dialog } from 'electron'
import JSZip from 'jszip'
import { pathExists, ensureDir } from '../utils/fileSystem'
import { resolveInstallInfo } from './InstallService'
import { getProfilesFromDatabase, createProfile, updateProfile } from './ProfileService'
import { scanMods } from './ModService'
import { getWorldConfig } from './WorldService'
import type {
  ExportModpackOptions,
  ExportModpackResult,
  ImportModpackResult,
  ExportWorldModsOptions,
  ExportWorldModsResult,
  ImportWorldModsResult,
  ModLocation,
} from '../../src/shared/hymn-types'

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
 * Export a modpack (profile with mod list).
 */
export async function exportModpack(options: ExportModpackOptions): Promise<ExportModpackResult> {
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

/**
 * Import a modpack.
 */
export async function importModpack(): Promise<ImportModpackResult> {
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

  const validEnabledMods = modpackMeta.enabledMods.filter((id) => knownModIds.has(id))

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

/**
 * Export mods for a specific world (includes mod files).
 */
export async function exportWorldMods(options: ExportWorldModsOptions): Promise<ExportWorldModsResult> {
  const { worldId } = options
  const info = await resolveInstallInfo()
  if (!info.activePath) {
    throw new Error('Hytale install path not configured.')
  }

  // Get world config to find enabled mods
  const worldConfig = await getWorldConfig(worldId)
  if (!worldConfig) {
    throw new Error('World not found.')
  }

  const enabledModIds = new Set<string>()
  if (worldConfig.Mods) {
    for (const [modId, config] of Object.entries(worldConfig.Mods)) {
      if ((config as { Enabled: boolean }).Enabled) {
        enabledModIds.add(modId)
      }
    }
  }

  // Scan mods to get the entries with paths
  const scan = await scanMods()
  const enabledMods = scan.entries.filter((entry) => enabledModIds.has(entry.id))

  if (enabledMods.length === 0) {
    throw new Error('No mods are enabled for this world.')
  }

  const zip = new JSZip()

  // Create manifest with metadata
  const manifest = {
    worldId,
    exportedAt: new Date().toISOString(),
    mods: enabledMods.map((mod) => ({
      id: mod.id,
      name: mod.name,
      version: mod.version,
      type: mod.type,
      format: mod.format,
      location: mod.location,
    })),
  }
  zip.file('worldmods.json', JSON.stringify(manifest, null, 2))

  // Add actual mod files/folders to the zip
  for (const mod of enabledMods) {
    const modPath = mod.path
    const modName = path.basename(modPath)
    const modFolder = zip.folder(`mods/${mod.location}/${modName}`)

    if (mod.format === 'directory') {
      // Add directory contents recursively
      await addDirectoryToZip(modFolder!, modPath)
    } else {
      // Add single file (zip or jar)
      const content = await fs.readFile(modPath)
      zip.file(`mods/${mod.location}/${modName}`, content)
    }
  }

  // Show save dialog
  const result = await dialog.showSaveDialog({
    title: 'Export World Mods',
    defaultPath: `${worldId}_mods.hymnmods`,
    filters: [{ name: 'Hymn World Mods', extensions: ['hymnmods'] }],
  })

  if (result.canceled || !result.filePath) {
    throw new Error('Export cancelled.')
  }

  const zipContent = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' })
  await fs.writeFile(result.filePath, zipContent)

  return {
    success: true,
    outputPath: result.filePath,
    modCount: enabledMods.length,
  }
}

/**
 * Import world mods (includes mod files).
 */
export async function importWorldMods(): Promise<ImportWorldModsResult> {
  const info = await resolveInstallInfo()
  if (!info.activePath) {
    throw new Error('Hytale install path not configured.')
  }

  // Show open dialog
  const result = await dialog.showOpenDialog({
    title: 'Import World Mods',
    filters: [{ name: 'Hymn World Mods', extensions: ['hymnmods'] }],
    properties: ['openFile'],
  })

  if (result.canceled || result.filePaths.length === 0) {
    throw new Error('Import cancelled.')
  }

  const filePath = result.filePaths[0]
  const data = await fs.readFile(filePath)
  const zip = await JSZip.loadAsync(data)

  // Read manifest
  const manifestFile = zip.file('worldmods.json')
  if (!manifestFile) {
    throw new Error('Invalid world mods file: missing worldmods.json')
  }

  const manifestContent = await manifestFile.async('string')
  const manifest = JSON.parse(manifestContent) as {
    worldId: string
    mods: Array<{ id: string; name: string; type: string; format: string; location: string }>
  }

  let modsImported = 0
  let modsSkipped = 0

  // Extract mods to appropriate locations
  const modsFolder = zip.folder('mods')
  if (modsFolder) {
    for (const modInfo of manifest.mods) {
      const location = modInfo.location as ModLocation
      let targetRoot: string | null = null

      if (location === 'mods' || location === 'packs') {
        // Both mods and packs go to Mods folder
        targetRoot = info.modsPath ?? path.join(info.activePath, 'UserData', 'Mods')
      } else if (location === 'earlyplugins') {
        targetRoot = info.earlyPluginsPath ?? path.join(info.activePath, 'UserData', 'EarlyPlugins')
      }

      if (!targetRoot) continue
      await ensureDir(targetRoot)

      // Find the mod files in the zip
      const modPrefix = `mods/${location}/`
      const modFiles = Object.keys(zip.files).filter((f) => f.startsWith(modPrefix) && f !== modPrefix)

      if (modFiles.length === 0) continue

      // Determine mod name from first file
      const firstFile = modFiles[0]
      const relativePath = firstFile.substring(modPrefix.length)
      const modName = relativePath.split('/')[0]
      const targetPath = path.join(targetRoot, modName)

      // Skip if already exists
      if (await pathExists(targetPath)) {
        modsSkipped++
        continue
      }

      // Extract mod
      for (const zipPath of modFiles) {
        const zipEntry = zip.files[zipPath]
        if (zipEntry.dir) continue

        const relPath = zipPath.substring(modPrefix.length)
        const destPath = path.join(targetRoot, relPath)

        await ensureDir(path.dirname(destPath))
        const content = await zipEntry.async('nodebuffer')
        await fs.writeFile(destPath, content)
      }

      modsImported++
    }
  }

  return {
    success: true,
    modsImported,
    modsSkipped,
  }
}
