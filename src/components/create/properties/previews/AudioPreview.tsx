import { memo, useState, useCallback, useRef, useEffect } from 'react'
import { Play, Pause, Volume2, VolumeX, AlertCircle, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAssetPreview, getMimeTypeFromPath } from '@/hooks/queries/useAssetPreview'

interface AudioPreviewProps {
  /** Absolute path to the audio file */
  filePath: string
  /** Show full controls (progress, volume) or just play button */
  compact?: boolean
  /** Additional class names */
  className?: string
}

/**
 * Audio preview with play/pause and optional progress/volume controls.
 */
export const AudioPreview = memo(function AudioPreview({
  filePath,
  compact = true,
  className,
}: AudioPreviewProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [progress, setProgress] = useState(0)
  const [duration, setDuration] = useState(0)
  const [isMuted, setIsMuted] = useState(false)
  const [volume, setVolume] = useState(0.7)

  const mimeType = getMimeTypeFromPath(filePath)
  const { data, isLoading, isError } = useAssetPreview({
    filePath,
    mimeType,
    enabled: true,
  })

  // Create audio element when data is available
  useEffect(() => {
    if (!data?.success || !data.dataUrl) return

    const audio = new Audio(data.dataUrl)
    audioRef.current = audio

    audio.volume = volume

    audio.addEventListener('loadedmetadata', () => {
      setDuration(audio.duration)
    })

    audio.addEventListener('timeupdate', () => {
      setProgress(audio.currentTime)
    })

    audio.addEventListener('ended', () => {
      setIsPlaying(false)
      setProgress(0)
    })

    return () => {
      audio.pause()
      audio.src = ''
    }
  }, [data?.success, data?.dataUrl, volume])

  // Update volume when changed
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume
    }
  }, [volume, isMuted])

  const togglePlay = useCallback(() => {
    if (!audioRef.current) return

    if (isPlaying) {
      audioRef.current.pause()
    } else {
      audioRef.current.play()
    }
    setIsPlaying(!isPlaying)
  }, [isPlaying])

  const handleSeek = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (!audioRef.current) return
    const newTime = parseFloat(e.target.value)
    audioRef.current.currentTime = newTime
    setProgress(newTime)
  }, [])

  const handleVolumeChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value)
    setVolume(newVolume)
    setIsMuted(false)
  }, [])

  const toggleMute = useCallback(() => {
    setIsMuted(!isMuted)
  }, [isMuted])

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  // Loading state
  if (isLoading) {
    return (
      <div
        className={cn(
          'flex items-center justify-center h-8 px-2 rounded border bg-muted/30',
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
          'flex items-center gap-2 h-8 px-2 rounded border border-destructive/30 bg-destructive/10',
          className
        )}
        title={data?.error || 'Failed to load audio'}
      >
        <AlertCircle className="h-4 w-4 text-destructive/60" />
        <span className="text-xs text-destructive/60">Error</span>
      </div>
    )
  }

  // Compact mode - just play button
  if (compact) {
    return (
      <button
        onClick={togglePlay}
        className={cn(
          'flex items-center justify-center h-8 w-8 rounded border bg-muted/30',
          'hover:bg-muted/50 transition-colors',
          isPlaying && 'bg-primary/10 border-primary/30',
          className
        )}
        title={isPlaying ? 'Pause' : 'Play'}
      >
        {isPlaying ? (
          <Pause className="h-4 w-4 text-primary" />
        ) : (
          <Play className="h-4 w-4 text-muted-foreground" />
        )}
      </button>
    )
  }

  // Full mode with progress and volume
  return (
    <div
      className={cn(
        'flex items-center gap-2 h-10 px-3 rounded border bg-muted/30',
        className
      )}
    >
      {/* Play/Pause button */}
      <button
        onClick={togglePlay}
        className={cn(
          'flex items-center justify-center h-6 w-6 rounded',
          'hover:bg-muted/50 transition-colors',
          isPlaying && 'text-primary'
        )}
      >
        {isPlaying ? (
          <Pause className="h-4 w-4" />
        ) : (
          <Play className="h-4 w-4" />
        )}
      </button>

      {/* Time display */}
      <span className="text-xs text-muted-foreground font-mono w-16 text-center">
        {formatTime(progress)} / {formatTime(duration)}
      </span>

      {/* Progress bar */}
      <input
        type="range"
        min="0"
        max={duration || 100}
        value={progress}
        onChange={handleSeek}
        className={cn(
          'flex-1 h-1 rounded-full appearance-none bg-muted cursor-pointer',
          '[&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:w-3',
          '[&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary'
        )}
      />

      {/* Volume control */}
      <button
        onClick={toggleMute}
        className="flex items-center justify-center h-6 w-6 rounded hover:bg-muted/50 transition-colors"
      >
        {isMuted || volume === 0 ? (
          <VolumeX className="h-4 w-4 text-muted-foreground" />
        ) : (
          <Volume2 className="h-4 w-4 text-muted-foreground" />
        )}
      </button>

      <input
        type="range"
        min="0"
        max="1"
        step="0.1"
        value={isMuted ? 0 : volume}
        onChange={handleVolumeChange}
        className={cn(
          'w-16 h-1 rounded-full appearance-none bg-muted cursor-pointer',
          '[&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:w-3',
          '[&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary'
        )}
      />
    </div>
  )
})
