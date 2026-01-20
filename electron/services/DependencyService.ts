import { execa } from 'execa'
import path from 'node:path'
import { pathExists } from '../utils/fileSystem'
import { readSetting, SETTINGS_KEYS } from '../core/database'
import { resolveInstallInfo } from './InstallService'
import type { CheckDependenciesResult, JavaDependencyInfo, HytaleDependencyInfo } from '../../src/shared/hymn-types'

/**
 * Run a command with arguments and capture output.
 */
async function runVersionCheck(command: string, args: string[] = []): Promise<{ stdout: string; stderr: string }> {
  const result = await execa(command, args, { reject: false })
  return { stdout: result.stdout, stderr: result.stderr }
}

/**
 * Check if Java is available and get its version.
 */
async function checkJavaVersion(): Promise<{ available: boolean; version?: string; path?: string }> {
  // First check for custom JDK path
  const customJdkPath = await readSetting(SETTINGS_KEYS.jdkPath)
  if (customJdkPath && (await pathExists(customJdkPath))) {
    const javaBinPath = process.platform === 'win32'
      ? path.join(customJdkPath, 'bin', 'java.exe')
      : path.join(customJdkPath, 'bin', 'java')

    try {
      const { stdout, stderr } = await runVersionCheck(javaBinPath, ['-version'])
      const output = stderr || stdout
      const match = output.match(/version "([^"]+)"/)
      if (match) {
        return { available: true, version: match[1], path: customJdkPath }
      }
    } catch {
      // Custom JDK path invalid
    }
  }

  // Check managed JDK
  const managedJdkPath = await readSetting(SETTINGS_KEYS.managedJdkPath)
  if (managedJdkPath && (await pathExists(managedJdkPath))) {
    const javaBinPath = process.platform === 'win32'
      ? path.join(managedJdkPath, 'bin', 'java.exe')
      : path.join(managedJdkPath, 'bin', 'java')

    try {
      const { stdout, stderr } = await runVersionCheck(javaBinPath, ['-version'])
      const output = stderr || stdout
      const match = output.match(/version "([^"]+)"/)
      if (match) {
        return { available: true, version: match[1], path: managedJdkPath }
      }
    } catch {
      // Managed JDK path invalid
    }
  }

  // Check system Java
  try {
    const { stdout, stderr } = await runVersionCheck('java', ['-version'])
    const output = stderr || stdout
    const match = output.match(/version "([^"]+)"/)
    if (match) {
      // Try to find JAVA_HOME
      const javaHome = process.env.JAVA_HOME
      return { available: true, version: match[1], path: javaHome }
    }
  } catch {
    // Java not in PATH
  }

  return { available: false }
}

/**
 * Check if Hytale is installed and get server jar info.
 */
async function checkHytaleInstall(): Promise<{ available: boolean; path?: string; serverJar?: string }> {
  const info = await resolveInstallInfo()

  if (!info.activePath) {
    return { available: false }
  }

  // Check for custom server JAR path
  const customServerJar = await readSetting(SETTINGS_KEYS.serverJarPath)
  if (customServerJar && (await pathExists(customServerJar))) {
    return { available: true, path: info.activePath, serverJar: customServerJar }
  }

  // Check default locations
  const serverJarPaths = [
    `${info.activePath}/install/release/package/game/latest/Server/HytaleServer.jar`,
    `${info.activePath}/install/pre-release/package/game/latest/Server/HytaleServer.jar`,
  ]

  for (const jarPath of serverJarPaths) {
    if (await pathExists(jarPath)) {
      return { available: true, path: info.activePath, serverJar: jarPath }
    }
  }

  return { available: true, path: info.activePath }
}

/**
 * Check all dependencies for plugin development.
 */
export async function checkDependencies(): Promise<CheckDependenciesResult> {
  const [javaStatus, hytaleStatus] = await Promise.all([
    checkJavaVersion(),
    checkHytaleInstall(),
  ])

  const javaIssues: string[] = []
  if (!javaStatus.available) {
    javaIssues.push('Java JDK not found')
  }

  const java: JavaDependencyInfo = {
    status: javaStatus.available ? 'found' : 'missing',
    jdkPath: javaStatus.path ?? null,
    version: javaStatus.version ?? null,
    issues: javaIssues,
    downloadInstructions: 'Install Java JDK 21+ or use the managed JDK option',
  }

  const hytaleIssues: string[] = []
  if (!hytaleStatus.available) {
    hytaleIssues.push('Hytale installation not found')
  }
  if (!hytaleStatus.serverJar) {
    hytaleIssues.push('HytaleServer.jar not configured')
  }

  const hytale: HytaleDependencyInfo = {
    status: hytaleStatus.available && hytaleStatus.serverJar ? 'found' : 'missing',
    hytalePath: hytaleStatus.path ?? null,
    serverJarPath: hytaleStatus.serverJar ?? null,
    patchline: 'unknown',
    issues: hytaleIssues,
  }

  return {
    java,
    hytale,
    canBuildPlugins: javaStatus.available && hytaleStatus.available && !!hytaleStatus.serverJar,
    canBuildPacks: true, // No dependencies needed for packs
  }
}
