import { ipcMain, dialog, BrowserWindow } from 'electron'
import fs from 'node:fs/promises'
import path from 'node:path'
import { pathExists } from '../utils/fileSystem'
import { resolveInstallInfo, setInstallPathOverride } from '../services/InstallService'
import {
  getProfilesState,
  createProfile,
  updateProfile,
  setActiveProfile,
} from '../services/ProfileService'
import {
  getWorlds,
  getWorldConfig,
  setModEnabled,
  setSelectedWorld,
} from '../services/WorldService'
import {
  scanModsWithWorld,
  deleteMod,
  addMods,
  applyProfile,
} from '../services/ModService'
import {
  listDeletedMods,
  restoreDeletedMod,
  permanentlyDeleteMod,
  clearDeletedMods,
} from '../services/DeletedModsService'
import {
  listServerAssets,
  createServerAsset,
  duplicateServerAsset,
  moveServerAsset,
  deleteServerAsset,
  listVanillaAssets,
  importVanillaAsset,
} from '../services/AssetService'
import {
  listProjects,
  deleteProject,
  installProject,
  uninstallProject,
  packageMod,
  listProjectFiles,
  readFile,
  saveFile,
  openInExplorer,
  openInEditor,
  createPack,
  listPackLanguages,
  getPackTranslations,
  savePackTranslations,
  createPackLanguage,
  getModManifest,
  saveModManifest,
  listModAssets,
} from '../services/ProjectService'
import {
  buildPlugin,
  buildPack,
  listBuildArtifacts,
  deleteBuildArtifact,
  clearAllBuildArtifacts,
  revealBuildArtifact,
  copyArtifactToMods,
  listInstalledMods,
  openBuildsFolder,
} from '../services/BuildService'
import {
  listJavaSources,
  createJavaClass,
  deleteJavaClass,
  renameJavaFile,
  deleteJavaPackage,
  renameJavaPackage,
} from '../services/JavaService'
import { checkDependencies } from '../services/DependencyService'
import {
  exportModpack,
  importModpack,
  exportWorldMods,
  importWorldMods,
} from '../services/ExportImportService'
import { createPlugin } from '../services/PluginService'
import { watcherManager } from '../fileWatchers'
import type {
  Profile,
  SetModEnabledOptions,
  DeleteModOptions,
  CreatePackOptions,
  CreatePluginOptions,
  ServerAssetListOptions,
  CreateServerAssetOptions,
  DuplicateServerAssetOptions,
  MoveServerAssetOptions,
  DeleteServerAssetOptions,
  VanillaAssetListOptions,
  ImportVanillaAssetOptions,
  ExportModpackOptions,
  ExportWorldModsOptions,
  DeleteProjectOptions,
  InstallProjectOptions,
  UninstallProjectOptions,
  PackageModOptions,
  ListProjectFilesOptions,
  BuildPluginOptions,
  BuildPackOptions,
  DeleteBuildArtifactOptions,
  ListJavaSourcesOptions,
  CreateJavaClassOptions,
  RestoreDeletedModOptions,
  ListPackLanguagesOptions,
  GetPackTranslationsOptions,
  SavePackTranslationsOptions,
  CreatePackLanguageOptions,
  SelectAssetFileOptions,
  SelectAssetFileResult,
} from '../../src/shared/hymn-types'

export function registerHymnHandlers(): void {
  // Install info
  ipcMain.handle('hymn:get-install-info', async () => resolveInstallInfo())

  ipcMain.handle('hymn:select-install-path', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory'],
      title: 'Select Hytale Install Folder',
    })

    if (result.canceled || result.filePaths.length === 0) {
      return resolveInstallInfo()
    }

    await setInstallPathOverride(result.filePaths[0])
    return resolveInstallInfo()
  })

  // Mod scanning
  ipcMain.handle('hymn:scan-mods', async (_event, worldId?: string) => scanModsWithWorld(worldId))

  // Legacy profile handlers (kept for backwards compatibility)
  ipcMain.handle('hymn:get-profiles', async () => getProfilesState())
  ipcMain.handle('hymn:create-profile', async (_event, name: string) => createProfile(name ?? ''))
  ipcMain.handle('hymn:update-profile', async (_event, profile: Profile) => updateProfile(profile))
  ipcMain.handle('hymn:set-active-profile', async (_event, profileId: string) => setActiveProfile(profileId))
  ipcMain.handle('hymn:apply-profile', async (_event, profileId: string) => applyProfile(profileId))

  // World management handlers
  ipcMain.handle('hymn:get-worlds', async () => getWorlds())
  ipcMain.handle('hymn:get-world-config', async (_event, worldId: string) => getWorldConfig(worldId))
  ipcMain.handle('hymn:set-mod-enabled', async (_event, options: SetModEnabledOptions) => setModEnabled(options))
  ipcMain.handle('hymn:set-selected-world', async (_event, worldId: string) => setSelectedWorld(worldId))

  // Mod management handlers
  ipcMain.handle('hymn:delete-mod', async (_event, options: DeleteModOptions) => deleteMod(options))
  ipcMain.handle('hymn:add-mods', async () => addMods())

  // Deleted mods management handlers
  ipcMain.handle('hymn:list-deleted-mods', async () => listDeletedMods())
  ipcMain.handle('hymn:restore-deleted-mod', async (_event, options: RestoreDeletedModOptions) => restoreDeletedMod(options))
  ipcMain.handle('hymn:permanently-delete-mod', async (_event, options: { backupId: string }) => permanentlyDeleteMod(options))
  ipcMain.handle('hymn:clear-deleted-mods', async () => clearDeletedMods())

  // Pack/Plugin creation
  ipcMain.handle('hymn:create-pack', async (_event, options: CreatePackOptions) => createPack(options))
  ipcMain.handle('hymn:create-plugin', async (_event, options: CreatePluginOptions) => createPlugin(options))

  // Mod manifest
  ipcMain.handle('hymn:get-mod-manifest', async (_event, options: { path: string }) => getModManifest(options))
  ipcMain.handle('hymn:save-mod-manifest', async (_event, options: { path: string; manifest: Record<string, unknown> }) => saveModManifest(options))
  ipcMain.handle('hymn:list-mod-assets', async (_event, options: { path: string }) => listModAssets(options))

  // Server assets
  ipcMain.handle('hymn:list-server-assets', async (_event, options: ServerAssetListOptions) => listServerAssets(options))
  ipcMain.handle('hymn:create-server-asset', async (_event, options: CreateServerAssetOptions) => createServerAsset(options))
  ipcMain.handle('hymn:duplicate-server-asset', async (_event, options: DuplicateServerAssetOptions) => duplicateServerAsset(options))
  ipcMain.handle('hymn:move-server-asset', async (_event, options: MoveServerAssetOptions) => moveServerAsset(options))
  ipcMain.handle('hymn:delete-server-asset', async (_event, options: DeleteServerAssetOptions) => deleteServerAsset(options))

  // Vanilla assets
  ipcMain.handle('hymn:list-vanilla-assets', async (_event, options: VanillaAssetListOptions) => listVanillaAssets(options))
  ipcMain.handle('hymn:import-vanilla-asset', async (_event, options: ImportVanillaAssetOptions) => importVanillaAsset(options))

  // Export/Import
  ipcMain.handle('hymn:export-modpack', async (_event, options: ExportModpackOptions) => exportModpack(options))
  ipcMain.handle('hymn:import-modpack', async () => importModpack())
  ipcMain.handle('hymn:export-world-mods', async (_event, options: ExportWorldModsOptions) => exportWorldMods(options))
  ipcMain.handle('hymn:import-world-mods', async () => importWorldMods())

  // Projects folder management
  ipcMain.handle('hymn:list-projects', async () => listProjects())
  ipcMain.handle('hymn:delete-project', async (_event, options: DeleteProjectOptions) => deleteProject(options))
  ipcMain.handle('hymn:install-project', async (_event, options: InstallProjectOptions) => installProject(options))
  ipcMain.handle('hymn:uninstall-project', async (_event, options: UninstallProjectOptions) => uninstallProject(options))

  // File watcher handlers
  ipcMain.handle('hymn:watch-project', async (_event, projectPath: string) => watcherManager.startActiveProjectWatcher(projectPath))
  ipcMain.handle('hymn:unwatch-project', async () => watcherManager.stopActiveProjectWatcher())

  // Package mod (zip creation)
  ipcMain.handle('hymn:package-mod', async (_event, options: PackageModOptions) => packageMod(options))

  // File/folder operations
  ipcMain.handle('hymn:open-in-explorer', async (_event, targetPath: string) => openInExplorer(targetPath))
  ipcMain.handle('hymn:list-project-files', async (_event, options: ListProjectFilesOptions) => listProjectFiles(options))
  ipcMain.handle('hymn:read-file', async (_event, filePath: string) => readFile(filePath))
  ipcMain.handle('hymn:save-file', async (_event, filePath: string, content: string) => saveFile(filePath, content))
  ipcMain.handle('hymn:check-path-exists', async (_event, filePath: string) => pathExists(filePath))

  ipcMain.handle(
    'hymn:select-asset-file',
    async (_event, options: SelectAssetFileOptions): Promise<SelectAssetFileResult> => {
      const { defaultPath, modRoot, filters, title } = options

      // Use path.resolve to get absolute paths with proper OS separators
      const resolvedModRoot = path.resolve(modRoot)
      const resolvedDefaultPath = path.resolve(defaultPath)

      // Determine the starting path
      let startPath = resolvedModRoot // Default to project root

      // Try to use the specified defaultPath if it exists
      try {
        const stats = await fs.stat(resolvedDefaultPath)
        if (stats.isDirectory()) {
          startPath = resolvedDefaultPath
        } else {
          // If it's a file, use its parent directory
          startPath = path.dirname(resolvedDefaultPath)
        }
      } catch {
        // defaultPath doesn't exist, stay with modRoot
      }

      // Get the focused window for proper modal behavior
      const focusedWindow = BrowserWindow.getFocusedWindow()

      const dialogOptions: Electron.OpenDialogOptions = {
        properties: ['openFile'],
        defaultPath: startPath,
        title: title || 'Select Asset File',
        filters: filters || [
          { name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'gif', 'webp', 'tga', 'dds'] },
          { name: 'Blocky Models', extensions: ['blockymodel'] },
          { name: 'Blocky Animations', extensions: ['blockyanim'] },
          { name: 'Audio', extensions: ['ogg', 'wav', 'mp3'] },
          { name: 'All Files', extensions: ['*'] },
        ],
      }

      // Pass the window to make dialog modal and defaultPath work correctly
      const result = focusedWindow
        ? await dialog.showOpenDialog(focusedWindow, dialogOptions)
        : await dialog.showOpenDialog(dialogOptions)

      if (result.canceled || result.filePaths.length === 0) {
        return { relativePath: null }
      }

      const selectedPath = result.filePaths[0]

      // Compute relative path from modRoot
      const normalizedSelected = selectedPath.replace(/\\/g, '/')
      const normalizedModRoot = modRoot.replace(/\\/g, '/')
      const modRootWithSlash = normalizedModRoot.endsWith('/') ? normalizedModRoot : normalizedModRoot + '/'

      if (normalizedSelected.startsWith(modRootWithSlash)) {
        const relativePath = normalizedSelected.slice(modRootWithSlash.length)
        return { relativePath }
      }

      // If the file is outside modRoot, return null (invalid selection)
      return { relativePath: null }
    },
  )

  // Java source file management for plugins
  ipcMain.handle('hymn:list-java-sources', async (_event, options: ListJavaSourcesOptions) => listJavaSources(options))
  ipcMain.handle('hymn:create-java-class', async (_event, options: CreateJavaClassOptions) => createJavaClass(options))
  ipcMain.handle(
    'hymn:delete-java-class',
    async (_event, options: { projectPath: string; relativePath: string }) => deleteJavaClass(options),
  )
  ipcMain.handle(
    'hymn:rename-java-file',
    async (_event, options: { projectPath: string; relativePath: string; newClassName: string }) =>
      renameJavaFile(options),
  )
  ipcMain.handle(
    'hymn:delete-java-package',
    async (_event, options: { projectPath: string; packagePath: string }) => deleteJavaPackage(options),
  )
  ipcMain.handle(
    'hymn:rename-java-package',
    async (_event, options: { projectPath: string; oldPackagePath: string; newPackageName: string }) =>
      renameJavaPackage(options),
  )

  // Build workflow handlers
  ipcMain.handle('hymn:check-dependencies', async () => checkDependencies())
  ipcMain.handle('hymn:build-plugin', async (_event, options: BuildPluginOptions) => buildPlugin(options))
  ipcMain.handle('hymn:build-pack', async (_event, options: BuildPackOptions) => buildPack(options))
  ipcMain.handle('hymn:list-build-artifacts', async () => listBuildArtifacts())
  ipcMain.handle('hymn:delete-build-artifact', async (_event, options: DeleteBuildArtifactOptions) => deleteBuildArtifact(options))
  ipcMain.handle('hymn:clear-all-build-artifacts', async () => clearAllBuildArtifacts())
  ipcMain.handle('hymn:reveal-build-artifact', async (_event, artifactId: string) => revealBuildArtifact(artifactId))
  ipcMain.handle('hymn:copy-artifact-to-mods', async (_event, artifactId: string) => copyArtifactToMods(artifactId))
  ipcMain.handle('hymn:list-installed-mods', async () => listInstalledMods())
  ipcMain.handle('hymn:open-builds-folder', async () => openBuildsFolder())
  ipcMain.handle('hymn:open-in-editor', async (_event, targetPath: string) => openInEditor(targetPath))

  // Translation management handlers
  ipcMain.handle('hymn:list-pack-languages', async (_event, options: ListPackLanguagesOptions) => listPackLanguages(options))
  ipcMain.handle('hymn:get-pack-translations', async (_event, options: GetPackTranslationsOptions) => getPackTranslations(options))
  ipcMain.handle('hymn:save-pack-translations', async (_event, options: SavePackTranslationsOptions) => savePackTranslations(options))
  ipcMain.handle('hymn:create-pack-language', async (_event, options: CreatePackLanguageOptions) => createPackLanguage(options))
}
