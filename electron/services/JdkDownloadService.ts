import fs from 'node:fs/promises'
import { createWriteStream } from 'node:fs'
import path from 'node:path'
import { BrowserWindow } from 'electron'
import type { ZipFile, Entry } from 'yauzl'
import { pathExists, ensureDir, removePath } from '../utils/fileSystem'

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
import type { JdkDownloadResult } from '../../src/shared/hymn-types'

const JDK_VERSION = '25'
const JDK_BUILD = '25+3'

// Module-level state
let downloadAbortController: AbortController | null = null

function getJdkDownloadUrl(): string {
  const platform = process.platform
  const arch = process.arch

  let osName: string
  let archName: string
  let ext: string

  if (platform === 'win32') {
    osName = 'windows'
    ext = 'zip'
  } else if (platform === 'darwin') {
    osName = 'macos'
    ext = 'tar.gz'
  } else {
    osName = 'linux'
    ext = 'tar.gz'
  }

  if (arch === 'x64') {
    archName = 'x64'
  } else if (arch === 'arm64') {
    archName = 'aarch64'
  } else {
    archName = 'x64' // Default to x64
  }

  // Using Adoptium (Eclipse Temurin) JDK 25 EA
  return `https://github.com/adoptium/temurin25-binaries/releases/download/jdk-${JDK_BUILD}/OpenJDK25U-jdk_${archName}_${osName}_hotspot_${JDK_VERSION}_3.${ext}`
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

function sendProgressUpdate(progress: number): void {
  const win = BrowserWindow.getFocusedWindow()
  if (win && !win.isDestroyed()) {
    win.webContents.send('jdk:download-progress', progress)
  }
}

/**
 * Download and install JDK.
 */
export async function downloadAndInstallJdk(): Promise<JdkDownloadResult> {
  const installDir = getJdkInstallDir()
  const downloadUrl = getJdkDownloadUrl()

  // Clean up existing installation
  if (await pathExists(installDir)) {
    await removePath(installDir)
  }
  await ensureDir(installDir)

  const isZip = downloadUrl.endsWith('.zip')
  const tempFile = path.join(installDir, isZip ? 'jdk.zip' : 'jdk.tar.gz')

  downloadAbortController = new AbortController()

  try {
    sendProgressUpdate(0)

    // Download file
    const response = await fetch(downloadUrl, {
      signal: downloadAbortController.signal,
    })

    if (!response.ok) {
      throw new Error(`Download failed: ${response.status} ${response.statusText}`)
    }

    const contentLength = parseInt(response.headers.get('content-length') || '0', 10)
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
        const progress = Math.round((receivedLength / contentLength) * 80) // 0-80% for download
        sendProgressUpdate(progress)
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
    sendProgressUpdate(85) // Extraction phase

    // Extract
    if (isZip) {
      await extractZip(tempFile, installDir)
    } else {
      await extractTarGz(tempFile, installDir)
    }

    // Clean up temp file
    await fs.unlink(tempFile)
    sendProgressUpdate(95)

    // Verify installation
    const javaBin = process.platform === 'win32'
      ? path.join(installDir, 'bin', 'java.exe')
      : path.join(installDir, 'bin', 'java')

    if (!(await pathExists(javaBin))) {
      throw new Error('JDK installation verification failed')
    }

    // Save the managed JDK path
    await writeSetting(SETTINGS_KEYS.managedJdkPath, installDir)
    sendProgressUpdate(100)

    downloadAbortController = null

    return {
      success: true,
      jdkPath: installDir,
      version: `${JDK_VERSION}`,
    }
  } catch (error) {
    // Clean up on error
    if (await pathExists(tempFile)) {
      await fs.unlink(tempFile).catch(() => {})
    }
    if (await pathExists(installDir)) {
      await removePath(installDir).catch(() => {})
    }

    downloadAbortController = null

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
