import fs from 'node:fs/promises'
import path from 'node:path'
import { pathExists, ensureDir } from '../utils/fileSystem'
import { isWithinPath } from '../utils/security'
import { JAVA_CLASS_TEMPLATE_BUILDERS } from '../templates/javaClassBuilders'
import type {
  ListJavaSourcesOptions,
  ListJavaSourcesResult,
  JavaSourceFile,
  CreateJavaClassOptions,
  CreateJavaClassResult,
} from '../../src/shared/hymn-types'

/**
 * Extract plugin package info from manifest.
 */
export async function extractPluginPackageInfo(
  projectPath: string,
): Promise<{ basePackage: string; sourceRoot: string } | null> {
  const resourcesManifestPath = path.join(projectPath, 'src', 'main', 'resources', 'manifest.json')

  if (!(await pathExists(resourcesManifestPath))) {
    return null
  }

  try {
    const content = await fs.readFile(resourcesManifestPath, 'utf-8')
    const manifest = JSON.parse(content) as Record<string, unknown>
    const mainClass = manifest.Main as string | undefined

    if (!mainClass) {
      return null
    }

    // Extract package from Main class (e.g., "com.example.MyPlugin" -> "com.example")
    const lastDot = mainClass.lastIndexOf('.')
    const basePackage = lastDot > 0 ? mainClass.substring(0, lastDot) : mainClass

    const sourceRoot = path.join(projectPath, 'src', 'main', 'java')
    return { basePackage, sourceRoot }
  } catch {
    return null
  }
}

/**
 * List Java source files in a plugin project.
 */
export async function listJavaSources(options: ListJavaSourcesOptions): Promise<ListJavaSourcesResult> {
  const packageInfo = await extractPluginPackageInfo(options.projectPath)

  if (!packageInfo) {
    return { sources: [], basePackage: '', sourceRoot: '' }
  }

  const { basePackage, sourceRoot } = packageInfo
  const sources: JavaSourceFile[] = []

  async function scanDirectory(dirPath: string, packagePrefix: string) {
    if (!(await pathExists(dirPath))) {
      return
    }

    const entries = await fs.readdir(dirPath, { withFileTypes: true })

    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name)

      if (entry.isDirectory()) {
        const subPackage = packagePrefix ? `${packagePrefix}.${entry.name}` : entry.name
        await scanDirectory(fullPath, subPackage)
      } else if (entry.isFile() && entry.name.endsWith('.java')) {
        const className = entry.name.replace(/\.java$/, '')
        const relativePath = path.relative(sourceRoot, fullPath).replace(/\\/g, '/')

        sources.push({
          id: relativePath,
          name: entry.name,
          className,
          packageName: packagePrefix || basePackage,
          relativePath,
          absolutePath: fullPath,
        })
      }
    }
  }

  // Start scanning from the base package directory
  const basePackagePath = path.join(sourceRoot, basePackage.replace(/\./g, '/'))
  await scanDirectory(basePackagePath, basePackage)

  // Sort by package name, then class name
  sources.sort((a, b) => {
    const pkgCompare = a.packageName.localeCompare(b.packageName)
    if (pkgCompare !== 0) return pkgCompare
    return a.className.localeCompare(b.className)
  })

  return { sources, basePackage, sourceRoot }
}

/**
 * Create a new Java class.
 */
export async function createJavaClass(options: CreateJavaClassOptions): Promise<CreateJavaClassResult> {
  const packageInfo = await extractPluginPackageInfo(options.projectPath)

  if (!packageInfo) {
    throw new Error('Could not determine plugin package structure. Is this a valid plugin project?')
  }

  const { basePackage, sourceRoot } = packageInfo

  // Validate class name (PascalCase)
  if (!/^[A-Z][a-zA-Z0-9]*$/.test(options.className)) {
    throw new Error('Class name must be in PascalCase (e.g., MyClass, HelloCommand)')
  }

  // Build the full package name
  const fullPackage = options.packagePath
    ? `${basePackage}.${options.packagePath.replace(/\//g, '.')}`
    : basePackage

  // Build the file path
  const packageDir = path.join(sourceRoot, fullPackage.replace(/\./g, '/'))
  const filePath = path.join(packageDir, `${options.className}.java`)
  const relativePath = path.relative(sourceRoot, filePath).replace(/\\/g, '/')

  // Check if file already exists
  if (await pathExists(filePath)) {
    throw new Error(`A class named "${options.className}" already exists in package "${fullPackage}"`)
  }

  // Get the template builder
  const templateBuilder = JAVA_CLASS_TEMPLATE_BUILDERS[options.template]
  if (!templateBuilder) {
    throw new Error(`Unknown template: ${options.template}`)
  }

  // Generate the class content
  const content = templateBuilder(fullPackage, options.className)

  // Create the directory and write the file
  await ensureDir(packageDir)
  await fs.writeFile(filePath, content, 'utf-8')

  return {
    success: true,
    filePath,
    relativePath,
  }
}

/**
 * Delete a Java class.
 */
export async function deleteJavaClass(options: {
  projectPath: string
  relativePath: string
}): Promise<{ success: boolean }> {
  const sourceRoot = path.join(options.projectPath, 'src', 'main', 'java')
  const filePath = path.join(sourceRoot, options.relativePath)

  // Security check: ensure the path is within the source root
  if (!isWithinPath(filePath, sourceRoot)) {
    throw new Error('Invalid file path')
  }

  if (!(await pathExists(filePath))) {
    throw new Error('File not found')
  }

  await fs.unlink(filePath)
  return { success: true }
}

/**
 * Rename a Java file.
 */
export async function renameJavaFile(options: {
  projectPath: string
  relativePath: string
  newClassName: string
}): Promise<{ success: boolean; newRelativePath: string }> {
  const sourceRoot = path.join(options.projectPath, 'src', 'main', 'java')
  const filePath = path.join(sourceRoot, options.relativePath)

  // Security check: ensure the path is within the source root
  if (!isWithinPath(filePath, sourceRoot)) {
    throw new Error('Invalid file path')
  }

  if (!(await pathExists(filePath))) {
    throw new Error('File not found')
  }

  // Validate new class name (must be a valid Java identifier)
  if (!/^[A-Z][a-zA-Z0-9_]*$/.test(options.newClassName)) {
    throw new Error('Invalid class name. Must start with uppercase letter and contain only alphanumeric characters.')
  }

  const dir = path.dirname(filePath)
  const newFileName = `${options.newClassName}.java`
  const newFilePath = path.join(dir, newFileName)

  // Check if new file already exists
  if (await pathExists(newFilePath)) {
    throw new Error('A file with that name already exists')
  }

  // Read the file content and update the class name
  let content = await fs.readFile(filePath, 'utf-8')

  // Extract the old class name from the file name
  const oldClassName = path.basename(options.relativePath, '.java')

  // Replace class declaration (handles public class, class, public final class, etc.)
  content = content.replace(
    new RegExp(`(\\b(?:public\\s+)?(?:final\\s+)?(?:abstract\\s+)?class\\s+)${oldClassName}\\b`, 'g'),
    `$1${options.newClassName}`,
  )

  // Replace constructor declarations
  content = content.replace(new RegExp(`\\b${oldClassName}\\s*\\(`, 'g'), `${options.newClassName}(`)

  // Write the updated content to the new file
  await fs.writeFile(newFilePath, content, 'utf-8')

  // Delete the old file
  await fs.unlink(filePath)

  const newRelativePath = path.join(path.dirname(options.relativePath), newFileName).replace(/\\/g, '/')

  return { success: true, newRelativePath }
}

/**
 * Delete a Java package (directory and all contents).
 */
export async function deleteJavaPackage(options: {
  projectPath: string
  packagePath: string
}): Promise<{ success: boolean; deletedFiles: number }> {
  const sourceRoot = path.join(options.projectPath, 'src', 'main', 'java')
  const packageDir = path.join(sourceRoot, options.packagePath.replace(/\./g, path.sep))

  // Security check: ensure the path is within the source root
  if (!isWithinPath(packageDir, sourceRoot)) {
    throw new Error('Invalid package path')
  }

  if (!(await pathExists(packageDir))) {
    throw new Error('Package not found')
  }

  // Count files before deletion
  const countFiles = async (dir: string): Promise<number> => {
    let count = 0
    const entries = await fs.readdir(dir, { withFileTypes: true })
    for (const entry of entries) {
      if (entry.isDirectory()) {
        count += await countFiles(path.join(dir, entry.name))
      } else if (entry.name.endsWith('.java')) {
        count++
      }
    }
    return count
  }

  const deletedFiles = await countFiles(packageDir)

  // Remove the directory recursively
  await fs.rm(packageDir, { recursive: true, force: true })

  return { success: true, deletedFiles }
}

/**
 * Rename a Java package.
 */
export async function renameJavaPackage(options: {
  projectPath: string
  oldPackagePath: string
  newPackageName: string
}): Promise<{ success: boolean; renamedFiles: number }> {
  const sourceRoot = path.join(options.projectPath, 'src', 'main', 'java')
  const oldPackageDir = path.join(sourceRoot, options.oldPackagePath.replace(/\./g, path.sep))

  // Security check: ensure the path is within the source root
  if (!isWithinPath(oldPackageDir, sourceRoot)) {
    throw new Error('Invalid package path')
  }

  if (!(await pathExists(oldPackageDir))) {
    throw new Error('Package not found')
  }

  // Validate new package name
  if (!/^[a-z][a-z0-9_]*$/.test(options.newPackageName)) {
    throw new Error('Invalid package name. Must start with lowercase letter and contain only lowercase letters, numbers, and underscores.')
  }

  // Compute the new package directory path
  const parentDir = path.dirname(oldPackageDir)
  const newPackageDir = path.join(parentDir, options.newPackageName)

  // Check if new package already exists
  if (await pathExists(newPackageDir)) {
    throw new Error('A package with that name already exists')
  }

  // Get the old and new full package names
  const relativeOldPath = path.relative(sourceRoot, oldPackageDir)
  const relativeNewPath = path.relative(sourceRoot, newPackageDir)
  const oldFullPackage = relativeOldPath.replace(/[\\/]/g, '.')
  const newFullPackage = relativeNewPath.replace(/[\\/]/g, '.')

  // Update package declarations in all Java files
  const updatePackageInFiles = async (dir: string, oldPkg: string, newPkg: string): Promise<number> => {
    let count = 0
    const entries = await fs.readdir(dir, { withFileTypes: true })

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name)
      if (entry.isDirectory()) {
        count += await updatePackageInFiles(fullPath, oldPkg, newPkg)
      } else if (entry.name.endsWith('.java')) {
        const content = await fs.readFile(fullPath, 'utf-8')
        // Update package declaration
        const updatedContent = content.replace(
          new RegExp(`^(\\s*package\\s+)${oldPkg.replace(/\./g, '\\.')}(\\s*;)`, 'm'),
          `$1${newPkg}$2`,
        )
        if (updatedContent !== content) {
          await fs.writeFile(fullPath, updatedContent, 'utf-8')
          count++
        }
      }
    }
    return count
  }

  const renamedFiles = await updatePackageInFiles(oldPackageDir, oldFullPackage, newFullPackage)

  // Rename the directory
  await fs.rename(oldPackageDir, newPackageDir)

  return { success: true, renamedFiles }
}
