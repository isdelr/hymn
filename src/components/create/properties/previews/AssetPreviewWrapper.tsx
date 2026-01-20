import { memo } from 'react'
import { ImagePreview } from './ImagePreview'
import { AudioPreview } from './AudioPreview'
import { getPreviewTypeFromPath } from '@/hooks/queries/useAssetPreview'
import type { PathPreviewType } from '../types'

interface AssetPreviewWrapperProps {
  /** Absolute path to the asset file */
  filePath: string
  /** Override auto-detected preview type */
  previewType?: PathPreviewType
  /** Size variant for image previews */
  imageSize?: 'sm' | 'md' | 'lg'
  /** Compact mode for audio previews */
  audioCompact?: boolean
  /** Additional class names */
  className?: string
}

/**
 * Auto-detecting preview wrapper that renders the appropriate
 * preview component based on file extension.
 */
export const AssetPreviewWrapper = memo(function AssetPreviewWrapper({
  filePath,
  previewType,
  imageSize = 'md',
  audioCompact = true,
  className,
}: AssetPreviewWrapperProps) {
  // Auto-detect preview type if not provided
  const effectiveType = previewType ?? getPreviewTypeFromPath(filePath)

  if (effectiveType === 'none') {
    return null
  }

  if (effectiveType === 'image') {
    return (
      <ImagePreview
        filePath={filePath}
        size={imageSize}
        className={className}
      />
    )
  }

  if (effectiveType === 'sound') {
    return (
      <AudioPreview
        filePath={filePath}
        compact={audioCompact}
        className={className}
      />
    )
  }

  // Model preview could be added here in the future
  return null
})
