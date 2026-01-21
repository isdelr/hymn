import fs from 'node:fs/promises'
import { createWriteStream } from 'node:fs'
import path from 'node:path'
import { BrowserWindow } from 'electron'
import type { ZipFile, Entry } from 'yauzl'
import { pathExists, ensureDir, removePath, resolveJavaBinPath } from '../utils/fileSystem'

// Lazy-loaded modules for better startup performance
// @ts-expect-error - tar has no type declarations
let tarModule: typeof import('tar') | null = null
let yauzlModule: typeof import('yauzl') | null = null

async function getTar() {
  if (!tarModule) {
    // @ts-expect-error - tar has no type declarations
    tarModule = await import('tar')
  }
  return tarModule
}

async function getYauzl() {
  if (!yauzlModule) {
    yauzlModule = await import('yauzl')
  }
  return yauzlModule
}
import { getJdkInstallDir } from '../core/paths'
import { writeSetting, SETTINGS_KEYS } from '../core/database'
import type { JdkDownloadResult, JdkDownloadProgress, SupportedJdkVersion } from '../../src/shared/hymn-types'
import { DEFAULT_JDK_VERSION, SUPPORTED_JDK_VERSIONS, getGradleVersionForJdk } from '../../src/shared/hymn-types'

// Module-level state
let downloadAbortController: AbortController | null = null

interface JdkDownloadInfo {
  url: string
  version: string
  size: number
}

/**
 * Fetch JDK download info from Adoptium API
 */
async function getJdkDownloadInfo(majorVersion: SupportedJdkVersion): Promise<JdkDownloadInfo> {
  const platform = process.platform
  const arch = process.arch

  const os = platform === 'win32' ? 'windows' : platform === 'darwin' ? 'mac' : 'linux'
  const architecture = arch === 'arm64' ? 'aarch64' : 'x64'

  // Use Adoptium API to get latest release
  const apiUrl = `https://api.adoptium.net/v3/assets/latest/${majorVersion}/hotspot?os=${os}&architecture=${architecture}&image_type=jdk`

  const response = await fetch(apiUrl)
  if (!response.ok) {
    throw new Error(`Failed to fetch JDK info: ${response.status} ${response.statusText}`)
  }

  const data = await response.json()
  const binary = data[0]?.binary

  if (!binary?.package?.link) {
    throw new Error(`No JDK ${majorVersion} release found for ${os}/${architecture}`)
  }

  return {
    url: binary.package.link,
    version: data[0].version.semver || `${majorVersion}`,
    size: binary.package.size || 0,
  }
}

async function extractZip(zipPath: string, destDir: string): Promise<void> {
  const yauzl = await getYauzl()

  return new Promise((resolve, reject) => {
    yauzl.open(zipPath, { lazyEntries: true }, (err: Error | null, zipfile: ZipFile | undefined) => {
      if (err || !zipfile) {
        reject(err || new Error('Failed to open zip'))
        return
      }

      zipfile.readEntry()

      zipfile.on('entry', async (entry: Entry) => {
        // Strip the first directory component (jdk-XX/)
        const parts = entry.fileName.split('/')
        if (parts.length > 1) {
          parts.shift()
        }
        const relativePath = parts.join('/')

        if (!relativePath) {
          zipfile.readEntry()
          return
        }

        const fullPath = path.join(destDir, relativePath)

        if (entry.fileName.endsWith('/')) {
          await ensureDir(fullPath)
          zipfile.readEntry()
        } else {
          await ensureDir(path.dirname(fullPath))
          zipfile.openReadStream(entry, (err, readStream) => {
            if (err || !readStream) {
              reject(err || new Error('Failed to read zip entry'))
              return
            }
            const writeStream = createWriteStream(fullPath)
            readStream.pipe(writeStream)
            writeStream.on('close', () => {
              zipfile.readEntry()
            })
            writeStream.on('error', reject)
          })
        }
      })

      zipfile.on('end', () => {
        resolve()
      })

      zipfile.on('error', reject)
    })
  })
}

async function extractTarGz(tarPath: string, destDir: string): Promise<void> {
  const tar = await getTar()
  await tar.extract({
    file: tarPath,
    cwd: destDir,
    strip: 1, // Strip the first directory component
  })
}

function sendProgressUpdate(progress: JdkDownloadProgress): void {
  const win = BrowserWindow.getAllWindows()[0]
  if (win && !win.isDestroyed()) {
    win.webContents.send('jdk:download-progress', progress)
  }
}

/**
 * Validate that the provided version is supported
 */
function validateJdkVersion(version: number | undefined): SupportedJdkVersion {
  if (version === undefined) {
    return DEFAULT_JDK_VERSION
  }
  if (SUPPORTED_JDK_VERSIONS.includes(version as SupportedJdkVersion)) {
    return version as SupportedJdkVersion
  }
  return DEFAULT_JDK_VERSION
}

/**
 * Download and install JDK.
 */
export async function downloadAndInstallJdk(
  majorVersion?: SupportedJdkVersion
): Promise<JdkDownloadResult> {
  const version = validateJdkVersion(majorVersion)
  const installDir = getJdkInstallDir()

  downloadAbortController = new AbortController()

  try {
    sendProgressUpdate({
      status: 'downloading',
      bytesDownloaded: 0,
      totalBytes: 0,
      message: `Fetching JDK ${version} info...`,
      version: `${version}`,
    })

    // Fetch download info from Adoptium API
    const downloadInfo = await getJdkDownloadInfo(version)
    const downloadUrl = downloadInfo.url
    const fullVersion = downloadInfo.version

    // Clean up existing installation
    if (await pathExists(installDir)) {
      await removePath(installDir)
    }
    await ensureDir(installDir)

    const isZip = downloadUrl.endsWith('.zip')
    const tempFile = path.join(installDir, isZip ? 'jdk.zip' : 'jdk.tar.gz')

    sendProgressUpdate({
      status: 'downloading',
      bytesDownloaded: 0,
      totalBytes: downloadInfo.size,
      message: `Downloading JDK ${fullVersion}...`,
      version: fullVersion,
    })

    // Download file
    const response = await fetch(downloadUrl, {
      signal: downloadAbortController.signal,
    })

    if (!response.ok) {
      throw new Error(`Download failed: ${response.status} ${response.statusText}`)
    }

    const contentLength = downloadInfo.size || parseInt(response.headers.get('content-length') || '0', 10)
    const reader = response.body?.getReader()

    if (!reader) {
      throw new Error('Failed to get response reader')
    }

    const chunks: Uint8Array[] = []
    let receivedLength = 0

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      chunks.push(value)
      receivedLength += value.length

      if (contentLength > 0) {
        sendProgressUpdate({
          status: 'downloading',
          bytesDownloaded: receivedLength,
          totalBytes: contentLength,
          message: `Downloading JDK ${fullVersion}...`,
          version: fullVersion,
        })
      }
    }

    // Combine chunks and write to file
    const data = new Uint8Array(receivedLength)
    let position = 0
    for (const chunk of chunks) {
      data.set(chunk, position)
      position += chunk.length
    }

    await fs.writeFile(tempFile, data)
    sendProgressUpdate({
      status: 'extracting',
      bytesDownloaded: receivedLength,
      totalBytes: contentLength,
      message: `Extracting JDK ${fullVersion}...`,
      version: fullVersion,
    })

    // Extract
    if (isZip) {
      await extractZip(tempFile, installDir)
    } else {
      await extractTarGz(tempFile, installDir)
    }

    // Clean up temp file
    await fs.unlink(tempFile)
    sendProgressUpdate({
      status: 'extracting',
      bytesDownloaded: receivedLength,
      totalBytes: contentLength,
      message: 'Verifying installation...',
      version: fullVersion,
    })

    // Verify installation - handles both standard and macOS bundle structures
    const javaBin = await resolveJavaBinPath(installDir)
    if (!javaBin) {
      throw new Error('JDK installation verification failed')
    }

    // Save the managed JDK path and major version
    await writeSetting(SETTINGS_KEYS.managedJdkPath, installDir)
    await writeSetting(SETTINGS_KEYS.jdkMajorVersion, String(version))

    // Auto-configure Gradle version based on JDK version
    const gradleVersion = getGradleVersionForJdk(version)
    await writeSetting(SETTINGS_KEYS.gradleVersion, gradleVersion)

    sendProgressUpdate({
      status: 'complete',
      bytesDownloaded: receivedLength,
      totalBytes: contentLength,
      message: `JDK ${fullVersion} installed successfully`,
      version: fullVersion,
    })

    downloadAbortController = null

    return {
      success: true,
      jdkPath: installDir,
      version: fullVersion,
    }
  } catch (error) {
    downloadAbortController = null

    // Clean up on error
    const tempZip = path.join(installDir, 'jdk.zip')
    const tempTarGz = path.join(installDir, 'jdk.tar.gz')
    if (await pathExists(tempZip)) {
      await fs.unlink(tempZip).catch(() => {})
    }
    if (await pathExists(tempTarGz)) {
      await fs.unlink(tempTarGz).catch(() => {})
    }
    if (await pathExists(installDir)) {
      await removePath(installDir).catch(() => {})
    }

    if (error instanceof Error && error.name === 'AbortError') {
      return {
        success: false,
        error: 'Download cancelled',
      }
    }

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Cancel the current JDK download.
 */
export function cancelJdkDownload(): void {
  if (downloadAbortController) {
    downloadAbortController.abort()
    downloadAbortController = null
  }
}
