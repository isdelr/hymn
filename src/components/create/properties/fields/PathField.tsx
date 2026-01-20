import { memo, useCallback, useState, useEffect } from 'react'
import { FolderOpen, Check, AlertCircle, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { FieldProps } from '../types'

// Preview components will be imported from previews
// import { AssetPreviewWrapper } from '../previews/AssetPreviewWrapper'

/**
 * Path input field with file browser and optional preview.
 * Supports validation and inline image/audio previews.
 */
export const PathField = memo(function PathField({
  value,
  onChange,
  schema,
  disabled,
  modRoot,
}: FieldProps<string>) {
  const [isValid, setIsValid] = useState<boolean | null>(null)
  const [isChecking, setIsChecking] = useState(false)
  const [showError, setShowError] = useState(false)

  const pathConfig = schema.pathConfig
  const pathPrefix = pathConfig?.pathPrefix || ''
  const previewType = pathConfig?.previewType || 'none'

  // Validate path when value changes
  useEffect(() => {
    setShowError(false)

    const checkPath = async () => {
      if (!value || !modRoot) {
        setIsValid(null)
        return
      }

      setIsChecking(true)
      try {
        const normalizedRoot = modRoot.replace(/\\/g, '/')
        const normalizedValue = (value as string).replace(/\\/g, '/')
        const normalizedPrefix = pathPrefix.replace(/\\/g, '/')

        let fullPath = normalizedRoot
        if (!fullPath.endsWith('/')) fullPath += '/'
        if (normalizedPrefix) {
          fullPath += normalizedPrefix
          if (!fullPath.endsWith('/')) fullPath += '/'
        }
        fullPath += normalizedValue

        const exists = await window.hymn.checkPathExists(fullPath)
        setIsValid(exists)

        if (!exists) {
          setTimeout(() => setShowError(true), 50)
        }
      } catch {
        setIsValid(false)
        setTimeout(() => setShowError(true), 50)
      } finally {
        setIsChecking(false)
      }
    }

    const timeout = setTimeout(checkPath, 400)
    return () => clearTimeout(timeout)
  }, [value, modRoot, pathPrefix])

  const handleBrowse = useCallback(async () => {
    if (!modRoot) return

    const normalizedRoot = modRoot.replace(/\\/g, '/')
    const normalizedPrefix = pathPrefix.replace(/\\/g, '/')
    const baseDir = normalizedPrefix
      ? normalizedRoot + '/' + normalizedPrefix
      : normalizedRoot

    let defaultPath = baseDir

    // Use current value's parent directory if available
    if (value) {
      const normalizedValue = (value as string).replace(/\\/g, '/')
      const parentDir = normalizedValue.includes('/')
        ? normalizedValue.substring(0, normalizedValue.lastIndexOf('/'))
        : ''
      if (parentDir) {
        defaultPath = baseDir + '/' + parentDir
      }
    } else if (pathConfig?.suggestedFolder) {
      defaultPath = normalizedRoot + '/' + pathConfig.suggestedFolder.replace(/\\/g, '/')
    }

    try {
      const result = await window.hymn.selectAssetFile({
        defaultPath,
        modRoot: normalizedRoot,
        filters: pathConfig?.filters,
        title: `Select ${schema.label}`,
      })

      if (result.relativePath) {
        let finalPath = result.relativePath
        // Strip pathPrefix from returned path
        if (normalizedPrefix) {
          const prefixWithSlash = normalizedPrefix + '/'
          if (finalPath.startsWith(prefixWithSlash)) {
            finalPath = finalPath.substring(prefixWithSlash.length)
          }
        }
        onChange(finalPath)
      }
    } catch (err) {
      console.error('Failed to open file picker:', err)
    }
  }, [modRoot, pathPrefix, value, pathConfig, schema.label, onChange])

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange(e.target.value.replace(/\\/g, '/'))
    },
    [onChange]
  )

  // Compute full path for preview
  const fullPathForPreview = modRoot && value
    ? `${modRoot.replace(/\\/g, '/')}/${pathPrefix ? pathPrefix + '/' : ''}${(value as string).replace(/\\/g, '/')}`
    : null

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        {/* Input */}
        <div className="relative flex-1">
          <input
            type="text"
            value={value ?? ''}
            onChange={handleChange}
            disabled={disabled}
            placeholder={schema.placeholder}
            className={cn(
              'w-full h-8 pl-2 pr-8 rounded border bg-muted/30 text-sm font-mono',
              'focus:outline-none focus:ring-1 focus:bg-background transition-colors',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              'placeholder:text-muted-foreground/50',
              isValid === null && 'focus:ring-primary',
              isValid === false && 'border-destructive/60 focus:ring-destructive/50 bg-destructive/5',
              isValid === true && 'border-emerald-500/40 focus:ring-emerald-500/50 bg-emerald-500/5'
            )}
          />

          {/* Status indicator */}
          <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none">
            {isChecking && (
              <Loader2 className="h-4 w-4 text-muted-foreground animate-spin" />
            )}
            {!isChecking && isValid === true && (
              <div className="p-0.5 rounded-full bg-emerald-500/20">
                <Check className="h-3 w-3 text-emerald-500" />
              </div>
            )}
            {!isChecking && isValid === false && (
              <div className="p-0.5 rounded-full bg-destructive/20">
                <AlertCircle className="h-3 w-3 text-destructive" />
              </div>
            )}
          </div>
        </div>

        {/* Browse button */}
        <button
          type="button"
          onClick={handleBrowse}
          disabled={disabled || !modRoot}
          className={cn(
            'px-2 h-8 rounded border bg-muted/30 transition-colors',
            'hover:bg-muted/50 focus:outline-none focus:ring-1 focus:ring-primary',
            'disabled:opacity-50 disabled:cursor-not-allowed'
          )}
          title="Browse for file"
        >
          <FolderOpen className="h-4 w-4 text-muted-foreground" />
        </button>

        {/* Inline preview for images (small thumbnail) */}
        {previewType === 'image' && isValid && fullPathForPreview && (
          <div className="h-8 w-8 rounded border bg-muted/30 overflow-hidden shrink-0">
            {/* Preview will be rendered by ImagePreview component */}
            <InlineImagePreview filePath={fullPathForPreview} />
          </div>
        )}
      </div>

      {/* Error message */}
      {!isChecking && isValid === false && showError && (
        <div className="text-xs text-destructive flex items-center gap-1">
          <AlertCircle className="h-3 w-3" />
          File not found
        </div>
      )}
    </div>
  )
})

/**
 * Inline image preview component.
 * Shows a small thumbnail using the readBinaryFile IPC.
 */
function InlineImagePreview({ filePath }: { filePath: string }) {
  const [dataUrl, setDataUrl] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    const loadPreview = async () => {
      try {
        const ext = filePath.split('.').pop()?.toLowerCase() ?? 'png'
        const mimeType = {
          png: 'image/png',
          jpg: 'image/jpeg',
          jpeg: 'image/jpeg',
          gif: 'image/gif',
          webp: 'image/webp',
        }[ext] || 'image/png'

        const result = await window.hymn.readBinaryFile({
          filePath,
          mimeType,
          maxSizeBytes: 1_000_000, // 1MB limit for thumbnails
        })

        if (!cancelled && result.success && result.dataUrl) {
          setDataUrl(result.dataUrl)
        }
      } catch {
        // Ignore preview load errors
      }
    }

    loadPreview()
    return () => { cancelled = true }
  }, [filePath])

  if (!dataUrl) {
    return <div className="w-full h-full bg-muted/50 animate-pulse" />
  }

  return (
    <img
      src={dataUrl}
      alt=""
      className="w-full h-full object-cover"
      style={{ imageRendering: 'pixelated' }}
    />
  )
}
