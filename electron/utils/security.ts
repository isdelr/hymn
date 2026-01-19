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

/**
 * Path validation result with detailed error information.
 */
export interface PathValidationResult {
  valid: boolean
  error?: string
  resolvedPath?: string
}

/**
 * Validate a file path against security constraints.
 * Checks for null bytes, validates against allowed roots, and returns structured results.
 *
 * @param filePath - The path to validate
 * @param allowedRoots - Array of allowed root directories (null values are filtered out)
 * @returns Validation result with error message if invalid
 */
export function validateFilePath(
  filePath: string,
  allowedRoots: (string | null)[]
): PathValidationResult {
  // Check for null bytes (security vulnerability)
  if (filePath.includes('\0')) {
    return {
      valid: false,
      error: 'Path contains invalid null byte characters',
    }
  }

  // Check for empty or whitespace-only paths
  if (!filePath || !filePath.trim()) {
    return {
      valid: false,
      error: 'Path cannot be empty',
    }
  }

  // Resolve the path to handle any relative components
  const resolvedPath = path.resolve(filePath)

  // Check for common path traversal patterns (even after resolution)
  const suspiciousPatterns = ['..', '...', '.\\', './', '%2e', '%2E', '%00']
  const normalizedForCheck = filePath.toLowerCase().replace(/\\/g, '/')
  for (const pattern of suspiciousPatterns) {
    if (normalizedForCheck.includes(pattern.toLowerCase()) && pattern !== '..') {
      // '..' is handled by resolution, but encoded versions are suspicious
      if (pattern.startsWith('%')) {
        return {
          valid: false,
          error: 'Path contains suspicious encoded characters',
        }
      }
    }
  }

  // Filter out null allowed roots
  const validRoots = allowedRoots.filter((root): root is string => root !== null)

  if (validRoots.length === 0) {
    return {
      valid: false,
      error: 'No valid root directories configured',
    }
  }

  // Check if resolved path is within any of the allowed roots
  const isAllowed = validRoots.some((root) => isWithinPath(resolvedPath, root))

  if (!isAllowed) {
    return {
      valid: false,
      error: 'Path is outside allowed directories',
    }
  }

  return {
    valid: true,
    resolvedPath,
  }
}

/**
 * Validate that a string is a safe identifier (alphanumeric, underscores, hyphens).
 */
export function isValidIdentifier(value: string): boolean {
  if (!value || typeof value !== 'string') return false
  return /^[a-zA-Z0-9_-]+$/.test(value)
}

/**
 * Validate that a string is a safe package name (lowercase, dots, underscores).
 */
export function isValidPackageName(value: string): boolean {
  if (!value || typeof value !== 'string') return false
  return /^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)*$/.test(value)
}
