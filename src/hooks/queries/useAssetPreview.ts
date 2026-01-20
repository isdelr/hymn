import { useQuery } from '@tanstack/react-query'
import { queryKeys } from './queryKeys'
import type { ReadBinaryFileResult } from '@/shared/hymn-types'

interface UseAssetPreviewOptions {
  /** Full absolute path to the file */
  filePath: string | null
  /** MIME type for the data URL */
  mimeType: string
  /** Whether to enable the query */
  enabled?: boolean
  /** Maximum file size in bytes (default: 10MB) */
  maxSizeBytes?: number
}

/**
 * Hook to fetch binary asset data as a data URL for preview.
 * Uses React Query for caching with 5 minute stale time.
 */
export function useAssetPreview({
  filePath,
  mimeType,
  enabled = true,
  maxSizeBytes = 10_000_000,
}: UseAssetPreviewOptions) {
  return useQuery<ReadBinaryFileResult>({
    queryKey: queryKeys.assetPreview.byPath(filePath ?? ''),
    queryFn: async () => {
      if (!filePath) {
        return { success: false, error: 'No file path provided' }
      }
      return window.hymn.readBinaryFile({ filePath, mimeType, maxSizeBytes })
    },
    enabled: enabled && !!filePath,
    staleTime: 5 * 60 * 1000, // 5 minute cache
    gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
  })
}

/**
 * Get MIME type from file extension
 */
export function getMimeTypeFromPath(filePath: string): string {
  const ext = filePath.split('.').pop()?.toLowerCase() ?? ''

  const mimeTypes: Record<string, string> = {
    // Images
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    gif: 'image/gif',
    webp: 'image/webp',
    tga: 'image/x-tga',
    dds: 'image/vnd-ms.dds',
    // Audio
    ogg: 'audio/ogg',
    wav: 'audio/wav',
    mp3: 'audio/mpeg',
  }

  return mimeTypes[ext] || 'application/octet-stream'
}

/**
 * Determine preview type from file extension
 */
export function getPreviewTypeFromPath(filePath: string): 'image' | 'sound' | 'none' {
  const ext = filePath.split('.').pop()?.toLowerCase() ?? ''

  const imageExtensions = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'tga', 'dds']
  const soundExtensions = ['ogg', 'wav', 'mp3']

  if (imageExtensions.includes(ext)) return 'image'
  if (soundExtensions.includes(ext)) return 'sound'
  return 'none'
}
