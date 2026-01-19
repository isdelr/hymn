import path from 'node:path'
import { normalizeRelativeInput } from './fileSystem'

/**
 * Check if a target path is within a root directory.
 */
export function isWithinPath(target: string, root: string): boolean {
  const relative = path.relative(root, target)
  return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative))
}

/**
 * Ensure a relative path is safe and resolves within the root.
 * Throws if the path is invalid or escapes the root.
 */
export function ensureSafeRelativePath(root: string, relativePath: string): { normalized: string; resolved: string } {
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

/**
 * Ensure a path starts with 'Server/' for server asset validation.
 */
export function ensureServerRelativePath(relativePath: string): string {
  const normalized = normalizeRelativeInput(relativePath)
  if (!normalized.toLowerCase().startsWith('server/')) {
    throw new Error('Server assets must be placed under Server/.')
  }
  return normalized
}

/**
 * Validate that a mod path is within allowed mod folders.
 */
export async function validateModPath(
  modPath: string,
  allowedRoots: (string | null)[]
): Promise<boolean> {
  const validRoots = allowedRoots.filter((root): root is string => root !== null)
  return validRoots.some((root) => isWithinPath(modPath, root))
}
