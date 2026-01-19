import { CheckCircle2, XCircle, Loader2 } from 'lucide-react'
import { Progress } from '@/components/ui/progress'
import { Button } from '@/components/ui/button'
import type { JdkDownloadProgress as JdkDownloadProgressType } from '@/shared/hymn-types'
import { useCancelJdkDownload } from '@/hooks/mutations'

interface JdkDownloadProgressProps {
  progress: JdkDownloadProgressType
}

export function JdkDownloadProgress({ progress }: JdkDownloadProgressProps) {
  const cancelDownload = useCancelJdkDownload()

  const percent = progress.totalBytes > 0
    ? Math.round((progress.bytesDownloaded / progress.totalBytes) * 100)
    : 0

  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const isDownloading = progress.status === 'downloading'
  const isExtracting = progress.status === 'extracting'
  const isComplete = progress.status === 'complete'
  const isError = progress.status === 'error'
  const isActive = isDownloading || isExtracting

  return (
    <div className="py-4">
      <div className="flex items-center gap-3 mb-3">
        {isComplete ? (
          <CheckCircle2 className="h-6 w-6 text-emerald-500" />
        ) : isError ? (
          <XCircle className="h-6 w-6 text-red-500" />
        ) : (
          <Loader2 className="h-6 w-6 text-primary animate-spin" />
        )}
        <div className="flex-1">
          <div className="font-medium text-sm">
            {isDownloading && 'Downloading JDK...'}
            {isExtracting && 'Extracting JDK...'}
            {isComplete && 'JDK Installed'}
            {isError && 'Download Failed'}
          </div>
          <div className="text-xs text-muted-foreground">
            {progress.message}
          </div>
        </div>
      </div>

      {isActive && (
        <>
          <Progress value={isExtracting ? 100 : percent} className="h-2 mb-2" />
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            {isDownloading && progress.totalBytes > 0 ? (
              <>
                <span>{formatBytes(progress.bytesDownloaded)} / {formatBytes(progress.totalBytes)}</span>
                <span>{percent}%</span>
              </>
            ) : isExtracting ? (
              <span>Extracting files...</span>
            ) : (
              <span>Preparing...</span>
            )}
          </div>
          <div className="mt-4 flex justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={() => cancelDownload.mutate()}
              disabled={cancelDownload.isPending}
            >
              Cancel
            </Button>
          </div>
        </>
      )}

      {isComplete && (
        <div className="mt-2 p-2 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs">
          JDK has been installed and configured. You can now build plugins.
        </div>
      )}

      {isError && (
        <div className="mt-2 p-2 rounded bg-red-500/10 text-red-600 dark:text-red-400 text-xs">
          {progress.message}
        </div>
      )}
    </div>
  )
}
