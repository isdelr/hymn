import fs from 'node:fs/promises'
import path from 'node:path'
import { pathExists, ensureDir, copyPath, removePath, getPathSize } from '../utils/fileSystem'
import { isWithinPath } from '../utils/security'
import { getDeletedModsRoot } from '../core/paths'
import { resolveInstallInfo } from './InstallService'
import type {
  DeletedModEntry,
  ListDeletedModsResult,
  RestoreDeletedModOptions,
  RestoreDeletedModResult,
  ModFormat,
} from '../../src/shared/hymn-types'

/**
 * Parse a deleted mod backup filename.
 */
function parseDeletedModName(backupName: string): { name: string; timestamp: string } | null {
  // Format: modname_2024-01-15T12-34-56-789Z
  const match = backupName.match(/^(.+)_(\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-\d{3}Z)$/)
  if (!match) {
    return null
  }
  return {
    name: match[1],
    timestamp: match[2].replace(/-(\d{3}Z)$/, '.$1').replace(/-/g, ':').replace(/T:/, 'T'),
  }
}

/**
 * List all deleted mod backups.
 */
export async function listDeletedMods(): Promise<ListDeletedModsResult> {
  const deletedRoot = getDeletedModsRoot()
  const entries: DeletedModEntry[] = []

  if (!(await pathExists(deletedRoot))) {
    return { entries }
  }

  const items = await fs.readdir(deletedRoot, { withFileTypes: true })

  for (const item of items) {
    const backupPath = path.join(deletedRoot, item.name)
    const parsed = parseDeletedModName(item.name)

    if (!parsed) {
      continue
    }

    const size = await getPathSize(backupPath)

    // Determine format from the backup
    let format: ModFormat = 'directory'
    if (item.isFile()) {
      if (item.name.endsWith('.zip')) format = 'zip'
      else if (item.name.endsWith('.jar')) format = 'jar'
    }

    entries.push({
      id: item.name,
      originalName: parsed.name,
      deletedAt: parsed.timestamp,
      backupPath,
      size: size ?? 0,
      format,
    })
  }

  // Sort by deleted time, most recent first
  entries.sort((a, b) => b.deletedAt.localeCompare(a.deletedAt))

  return { entries }
}

/**
 * Restore a deleted mod from backup.
 */
export async function restoreDeletedMod(options: RestoreDeletedModOptions): Promise<RestoreDeletedModResult> {
  const info = await resolveInstallInfo()

  if (!info.modsPath) {
    throw new Error('Mods folder not found.')
  }

  const deletedRoot = getDeletedModsRoot()
  const backupPath = path.join(deletedRoot, options.backupId)

  // Safety: Verify backup is within deleted mods folder
  if (!isWithinPath(backupPath, deletedRoot)) {
    throw new Error('Invalid backup path.')
  }

  if (!(await pathExists(backupPath))) {
    throw new Error('Backup not found.')
  }

  // Parse the original mod name from backup
  const parsed = parseDeletedModName(options.backupId)
  if (!parsed) {
    throw new Error('Invalid backup filename format.')
  }

  const restorePath = path.join(info.modsPath, parsed.name)

  // Check if target already exists
  if (await pathExists(restorePath)) {
    throw new Error(`A mod named "${parsed.name}" already exists in the Mods folder.`)
  }

  // Restore the mod
  await ensureDir(info.modsPath)
  await copyPath(backupPath, restorePath)

  // Remove the backup after successful restore
  await removePath(backupPath)

  return { success: true, restoredPath: restorePath }
}

/**
 * Permanently delete a mod backup.
 */
export async function permanentlyDeleteMod(options: { backupId: string }): Promise<{ success: boolean }> {
  const deletedRoot = getDeletedModsRoot()
  const backupPath = path.join(deletedRoot, options.backupId)

  // Safety: Verify backup is within deleted mods folder
  if (!isWithinPath(backupPath, deletedRoot)) {
    throw new Error('Invalid backup path.')
  }

  if (!(await pathExists(backupPath))) {
    throw new Error('Backup not found.')
  }

  await removePath(backupPath)

  return { success: true }
}

/**
 * Clear all deleted mod backups.
 */
export async function clearDeletedMods(): Promise<{ success: boolean; deletedCount: number }> {
  const deletedRoot = getDeletedModsRoot()

  if (!(await pathExists(deletedRoot))) {
    return { success: true, deletedCount: 0 }
  }

  const items = await fs.readdir(deletedRoot)
  let deletedCount = 0

  for (const item of items) {
    const itemPath = path.join(deletedRoot, item)
    await removePath(itemPath)
    deletedCount++
  }

  return { success: true, deletedCount }
}
