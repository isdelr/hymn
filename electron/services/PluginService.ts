import fs from 'node:fs/promises'
import path from 'node:path'
import { pathExists, ensureDir, setExecutablePermission } from '../utils/fileSystem'
import { getProjectsRoot } from '../core/paths'
import { readSetting, SETTINGS_KEYS } from '../core/database'
import {
  generateSettingsGradle,
  generateGradleProperties,
  generateBuildGradle,
  generateGitignore,
  generateGradlew,
  generateGradlewBat,
  generateGradleWrapperProperties,
  generateMainJavaClass,
} from '../templates/gradleTemplates'
import type {
  CreatePluginOptions,
  CreatePluginResult,
  GradleVersion,
} from '../../src/shared/hymn-types'

/**
 * Create a new plugin project.
 */
export async function createPlugin(options: CreatePluginOptions): Promise<CreatePluginResult> {
  const pluginName = options.name.trim() || 'NewPlugin'
  const safeName = pluginName.replace(/[^a-zA-Z0-9_-]/g, '')
  const group = options.group.trim() || 'com.example'
  const version = options.version?.trim() || '0.0.1'

  // Read the detected JDK major version from settings, fall back to 21 if not set
  const detectedJdkVersion = await readSetting(SETTINGS_KEYS.jdkMajorVersion)
  const javaVersion = options.javaVersion ?? (detectedJdkVersion ? parseInt(detectedJdkVersion, 10) : 21)

  const patchline = options.patchline ?? 'release'

  // Get configured Gradle version from settings
  const gradleVersion = (await readSetting(SETTINGS_KEYS.gradleVersion) as GradleVersion) || '9.3.0'

  // Plugin goes into projects folder
  const projectsRoot = getProjectsRoot()
  const pluginsProjectRoot = path.join(projectsRoot, 'plugins')
  await ensureDir(pluginsProjectRoot)

  const pluginPath = path.join(pluginsProjectRoot, safeName)
  if (await pathExists(pluginPath)) {
    throw new Error(`A plugin named "${safeName}" already exists.`)
  }

  await ensureDir(pluginPath)

  // Create directory structure
  const packagePath = group.replace(/\./g, '/')
  const javaSourcePath = path.join(pluginPath, 'src', 'main', 'java', packagePath)
  const resourcesPath = path.join(pluginPath, 'src', 'main', 'resources')
  const serverResourcesPath = path.join(resourcesPath, 'Server')
  const gradleWrapperPath = path.join(pluginPath, 'gradle', 'wrapper')

  await ensureDir(javaSourcePath)
  await ensureDir(resourcesPath)
  await ensureDir(gradleWrapperPath)

  // Create asset folder structure
  // Client assets (Common/)
  await ensureDir(path.join(resourcesPath, 'Common', 'UI', 'Custom', 'Pages'))
  await ensureDir(path.join(resourcesPath, 'Common', 'Sounds'))
  await ensureDir(path.join(resourcesPath, 'Common', 'Icons'))
  // Server assets
  await ensureDir(serverResourcesPath)

  // Generate main class name from plugin name
  const mainClassName = safeName.charAt(0).toUpperCase() + safeName.slice(1)
  const fullMainClass = `${group}.${mainClassName}`

  // --- Template Files ---

  // settings.gradle
  await fs.writeFile(
    path.join(pluginPath, 'settings.gradle'),
    generateSettingsGradle(safeName),
    'utf-8'
  )

  // gradle.properties
  await fs.writeFile(
    path.join(pluginPath, 'gradle.properties'),
    generateGradleProperties({
      version,
      group,
      javaVersion,
      includesAssetPack: true,
      patchline,
    }),
    'utf-8'
  )

  // build.gradle
  await fs.writeFile(
    path.join(pluginPath, 'build.gradle'),
    generateBuildGradle(),
    'utf-8'
  )

  // .gitignore
  await fs.writeFile(
    path.join(pluginPath, '.gitignore'),
    generateGitignore(),
    'utf-8'
  )

  // gradlew (Unix) - ensure LF line endings for Unix compatibility
  const gradlewPath = path.join(pluginPath, 'gradlew')
  const gradlewContent = generateGradlew().replace(/\r\n/g, '\n')
  await fs.writeFile(gradlewPath, gradlewContent, 'utf-8')
  // Make gradlew executable on Unix systems (no-op on Windows)
  await setExecutablePermission(gradlewPath)

  // gradlew.bat (Windows)
  await fs.writeFile(
    path.join(pluginPath, 'gradlew.bat'),
    generateGradlewBat(),
    'utf-8'
  )

  // gradle-wrapper.properties
  await fs.writeFile(
    path.join(gradleWrapperPath, 'gradle-wrapper.properties'),
    generateGradleWrapperProperties(gradleVersion),
    'utf-8'
  )

  // Download gradle-wrapper.jar from official Gradle distributions
  // See: https://services.gradle.org/distributions/
  const gradleWrapperJarPath = path.join(gradleWrapperPath, 'gradle-wrapper.jar')
  try {
    // Official Gradle services URL: https://services.gradle.org/distributions/gradle-{VERSION}-wrapper.jar
    const wrapperJarUrl = `https://services.gradle.org/distributions/gradle-${gradleVersion}-wrapper.jar`
    const response = await fetch(wrapperJarUrl)
    if (response.ok) {
      const buffer = await response.arrayBuffer()
      await fs.writeFile(gradleWrapperJarPath, Buffer.from(buffer))
    } else {
      // Fallback: try GitHub raw URL (normalize version for tag, e.g., '8.5' -> 'v8.5.0')
      const fullVersion = gradleVersion.split('.').length === 2 ? `${gradleVersion}.0` : gradleVersion
      const altUrl = `https://github.com/gradle/gradle/raw/v${fullVersion}/gradle/wrapper/gradle-wrapper.jar`
      const altResponse = await fetch(altUrl)
      if (altResponse.ok) {
        const buffer = await altResponse.arrayBuffer()
        await fs.writeFile(gradleWrapperJarPath, Buffer.from(buffer))
      }
    }
  } catch {
    // If download fails, log warning but don't fail project creation
    console.warn('Failed to download gradle-wrapper.jar - user will need to run gradle wrapper manually')
  }

  // manifest.json
  // Build dependencies object from options
  const dependencies: Record<string, string> = {}
  if (options.dependencies && options.dependencies.length > 0) {
    for (const dep of options.dependencies) {
      dependencies[`Hytale:${dep}`] = '*'
    }
  }

  const manifest = {
    Group: group.split('.').pop() || safeName,
    Name: pluginName,
    Version: version,
    Description: options.description?.trim() || `A Hytale plugin created with Hymn.`,
    Authors: options.authorName?.trim() ? [{ Name: options.authorName.trim() }] : [{ Name: 'Unknown' }],
    Website: '',
    ServerVersion: options.serverVersion ?? '*',
    Dependencies: dependencies,
    OptionalDependencies: {},
    DisabledByDefault: false,
    Main: fullMainClass,
    IncludesAssetPack: true,
  }
  const manifestPath = path.join(resourcesPath, 'manifest.json')
  await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 4), 'utf-8')

  // Main Java class
  const mainClassPath = path.join(javaSourcePath, `${mainClassName}.java`)
  await fs.writeFile(
    mainClassPath,
    generateMainJavaClass({
      packageName: group,
      className: mainClassName,
      pluginName,
    }),
    'utf-8'
  )

  return {
    success: true,
    path: pluginPath,
    manifestPath,
    mainClassPath,
  }
}
