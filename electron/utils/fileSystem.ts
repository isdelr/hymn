import fs from 'node:fs/promises'
import { constants } from 'node:fs'
import path from 'node:path'
import fse from 'fs-extra'

// Re-export fs-extra functions for common operations
export const pathExists = fse.pathExists
export const ensureDir = fse.ensureDir
export const copyPath = fse.copy
export const removePath = fse.remove
export const movePath = fse.move

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
 * Read a JSON file and parse it.
 */
export async function readJsonFile(filePath: string): Promise<Record<string, unknown>> {
  const content = await fs.readFile(filePath, 'utf-8')
  return JSON.parse(content) as Record<string, unknown>
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

/**
 * Set executable permission on a file (755 on Unix, no-op on Windows).
 * Returns true if successful, false if permission setting was not needed or failed gracefully.
 */
export async function setExecutablePermission(filePath: string): Promise<boolean> {
  // On Windows, chmod is not needed - executability is determined by file extension
  if (process.platform === 'win32') {
    return true
  }

  try {
    await fs.chmod(filePath, 0o755)
    return true
  } catch (error) {
    // Log but don't throw - permission issues on some systems shouldn't break functionality
    console.warn(`Failed to set executable permission on ${filePath}:`, error)
    return false
  }
}

/**
 * Check file access with specific mode flags.
 * @param filePath - Path to the file
 * @param mode - Access mode (use fs.constants.R_OK, W_OK, X_OK)
 * @returns true if access is granted, false otherwise
 */
export async function checkFileAccess(
  filePath: string,
  mode: number = constants.R_OK
): Promise<boolean> {
  try {
    await fs.access(filePath, mode)
    return true
  } catch {
    return false
  }
}

/**
 * File access mode constants for cross-platform use.
 */
export const FileAccessMode = {
  /** File is visible (exists) */
  EXISTS: constants.F_OK,
  /** File can be read */
  READ: constants.R_OK,
  /** File can be written */
  WRITE: constants.W_OK,
  /** File can be executed */
  EXECUTE: constants.X_OK,
} as const

/**
 * Compare two paths for equality, respecting OS case sensitivity.
 * Linux is case-sensitive, Windows and macOS are case-insensitive.
 */
export function pathsEqual(path1: string, path2: string): boolean {
  const normalized1 = path.resolve(path1)
  const normalized2 = path.resolve(path2)

  // Linux is case-sensitive, Windows and macOS are case-insensitive
  if (process.platform === 'linux') {
    return normalized1 === normalized2
  }

  return normalized1.toLowerCase() === normalized2.toLowerCase()
}

/**
 * Resolve the Java binary path within a JDK directory.
 * Handles both standard JDK directories and macOS .jdk bundle structures.
 *
 * @param jdkPath - The root JDK directory path
 * @returns The full path to the java binary if found, null otherwise
 */
export async function resolveJavaBinPath(jdkPath: string): Promise<string | null> {
  const javaExe = process.platform === 'win32' ? 'java.exe' : 'java'

  // Standard JDK structure: {jdkPath}/bin/java
  const standardPath = path.join(jdkPath, 'bin', javaExe)
  if (await pathExists(standardPath)) {
    return standardPath
  }

  // macOS .jdk bundle structure: {jdkPath}/Contents/Home/bin/java
  if (process.platform === 'darwin') {
    const macBundlePath = path.join(jdkPath, 'Contents', 'Home', 'bin', javaExe)
    if (await pathExists(macBundlePath)) {
      return macBundlePath
    }
  }

  return null
}

/**
 * Resolve the JAVA_HOME path within a JDK directory.
 * Handles both standard JDK directories and macOS .jdk bundle structures.
 *
 * @param jdkPath - The root JDK directory path
 * @returns The JAVA_HOME path if found, null otherwise
 */
export async function resolveJavaHomePath(jdkPath: string): Promise<string | null> {
  const javaExe = process.platform === 'win32' ? 'java.exe' : 'java'

  // Standard JDK structure: {jdkPath}/bin/java - JAVA_HOME is jdkPath
  const standardPath = path.join(jdkPath, 'bin', javaExe)
  if (await pathExists(standardPath)) {
    return jdkPath
  }

  // macOS .jdk bundle structure: {jdkPath}/Contents/Home/bin/java - JAVA_HOME is Contents/Home
  if (process.platform === 'darwin') {
    const macHomePath = path.join(jdkPath, 'Contents', 'Home')
    const macBinPath = path.join(macHomePath, 'bin', javaExe)
    if (await pathExists(macBinPath)) {
      return macHomePath
    }
  }

  return null
}
