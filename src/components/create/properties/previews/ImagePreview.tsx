import { memo, useState, useCallback } from 'react'
import { Maximize2, X, AlertCircle, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAssetPreview, getMimeTypeFromPath } from '@/hooks/queries/useAssetPreview'

interface ImagePreviewProps {
  /** Absolute path to the image file */
  filePath: string
  /** Size variant */
  size?: 'sm' | 'md' | 'lg'
  /** Show expand button on hover */
  expandable?: boolean
  /** Additional class names */
  className?: string
}

const sizeClasses = {
  sm: 'h-8 w-8',
  md: 'h-16 w-16',
  lg: 'h-32 w-32',
}

/**
 * Image preview with thumbnail and optional modal expand.
 * Uses pixelated rendering for crisp pixel art.
 */
export const ImagePreview = memo(function ImagePreview({
  filePath,
  size = 'md',
  expandable = true,
  className,
}: ImagePreviewProps) {
  const [isModalOpen, setIsModalOpen] = useState(false)

  const mimeType = getMimeTypeFromPath(filePath)
  const { data, isLoading, isError } = useAssetPreview({
    filePath,
    mimeType,
    enabled: true,
  })

  const handleExpand = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    if (data?.success && data.dataUrl) {
      setIsModalOpen(true)
    }
  }, [data])

  const handleCloseModal = useCallback(() => {
    setIsModalOpen(false)
  }, [])

  // Loading state
  if (isLoading) {
    return (
      <div
        className={cn(
          'rounded border bg-muted/30 flex items-center justify-center',
          sizeClasses[size],
          className
        )}
      >
        <Loader2 className="h-4 w-4 text-muted-foreground animate-spin" />
      </div>
    )
  }

  // Error state
  if (isError || !data?.success) {
    return (
      <div
        className={cn(
          'rounded border border-destructive/30 bg-destructive/10 flex items-center justify-center',
          sizeClasses[size],
          className
        )}
        title={data?.error || 'Failed to load image'}
      >
        <AlertCircle className="h-4 w-4 text-destructive/60" />
      </div>
    )
  }

  return (
    <>
      {/* Thumbnail */}
      <div
        className={cn(
          'group relative rounded border bg-muted/30 overflow-hidden',
          sizeClasses[size],
          expandable && 'cursor-pointer',
          className
        )}
        onClick={expandable ? handleExpand : undefined}
      >
        <img
          src={data.dataUrl}
          alt=""
          className="w-full h-full object-contain"
          style={{ imageRendering: 'pixelated' }}
        />

        {/* Expand overlay */}
        {expandable && (
          <div
            className={cn(
              'absolute inset-0 bg-black/50 flex items-center justify-center',
              'opacity-0 group-hover:opacity-100 transition-opacity'
            )}
          >
            <Maximize2 className="h-4 w-4 text-white" />
          </div>
        )}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <ImageModal
          dataUrl={data.dataUrl!}
          filePath={filePath}
          onClose={handleCloseModal}
        />
      )}
    </>
  )
})

interface ImageModalProps {
  dataUrl: string
  filePath: string
  onClose: () => void
}

/**
 * Full-screen modal for viewing image at larger size.
 */
function ImageModal({ dataUrl, filePath, onClose }: ImageModalProps) {
  const fileName = filePath.split(/[/\\]/).pop() || 'Image'

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-8"
      onClick={onClose}
    >
      <div
        className="relative max-w-4xl max-h-full"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className={cn(
            'absolute -top-10 right-0 p-2 rounded-lg',
            'text-white/80 hover:text-white hover:bg-white/10',
            'transition-colors'
          )}
        >
          <X className="h-6 w-6" />
        </button>

        {/* Image */}
        <img
          src={dataUrl}
          alt={fileName}
          className="max-w-full max-h-[80vh] rounded-lg"
          style={{ imageRendering: 'pixelated' }}
        />

        {/* Filename */}
        <div className="mt-2 text-center text-sm text-white/60 font-mono">
          {fileName}
        </div>
      </div>
    </div>
  )
}
