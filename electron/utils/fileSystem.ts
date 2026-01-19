import fs from 'node:fs/promises'
import path from 'node:path'

/**
 * Check if a path exists on the filesystem.
 */
export async function pathExists(target: string): Promise<boolean> {
  try {
    await fs.access(target)
    return true
  } catch {
    return false
  }
}

/**
 * Get the total size of a file or directory in bytes.
 */
export async function getPathSize(target: string): Promise<number | undefined> {
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

/**
 * Ensure a directory exists, creating it recursively if needed.
 */
export async function ensureDir(target: string): Promise<void> {
  await fs.mkdir(target, { recursive: true })
}

/**
 * Copy a file or directory recursively.
 */
export async function copyPath(source: string, destination: string): Promise<void> {
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

/**
 * Remove a file or directory recursively.
 */
export async function removePath(target: string): Promise<void> {
  await fs.rm(target, { recursive: true, force: true })
}

/**
 * Move a file or directory. Falls back to copy+delete if cross-device.
 */
export async function movePath(source: string, destination: string): Promise<void> {
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

/**
 * Read a JSON file and parse it.
 */
export async function readJsonFile(filePath: string): Promise<Record<string, unknown>> {
  const content = await fs.readFile(filePath, 'utf-8')
  return JSON.parse(content) as Record<string, unknown>
}

/**
 * Calculate the total size of a directory recursively.
 */
export async function calculateDirectorySize(dirPath: string): Promise<number> {
  let totalSize = 0

  async function walkDir(currentPath: string) {
    const items = await fs.readdir(currentPath, { withFileTypes: true })
    for (const item of items) {
      const fullPath = path.join(currentPath, item.name)
      if (item.isDirectory()) {
        await walkDir(fullPath)
      } else {
        const stat = await fs.stat(fullPath)
        totalSize += stat.size
      }
    }
  }

  await walkDir(dirPath)
  return totalSize
}

/**
 * Normalize a path to use forward slashes (for cross-platform consistency).
 */
export function normalizeRelativePath(targetPath: string): string {
  return targetPath.split(path.sep).join('/')
}

/**
 * Normalize user input for a relative path.
 */
export function normalizeRelativeInput(value: string): string {
  return value.replace(/\\/g, '/').replace(/^\/+/, '').trim()
}
