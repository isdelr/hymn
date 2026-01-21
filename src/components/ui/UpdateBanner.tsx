import { X, Download, RotateCcw, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { useUpdateInfo } from '@/hooks/queries'
import { useDownloadAndInstall } from '@/hooks/mutations'
import { useUpdateStore } from '@/stores'

export function UpdateBanner() {
  const { data: updateInfo } = useUpdateInfo()
  const downloadAndInstall = useDownloadAndInstall()
  const { dismissVersion, isDismissed } = useUpdateStore()

  // Don't render if no data, idle, checking, not available, or error
  if (!updateInfo) return null
  if (updateInfo.status === 'idle') return null
  if (updateInfo.status === 'checking') return null
  if (updateInfo.status === 'not-available') return null
  if (updateInfo.status === 'error') return null

  // Don't show if this version has been dismissed
  if (updateInfo.version && isDismissed(updateInfo.version)) return null

  const isDownloading = updateInfo.status === 'downloading'
  const isDownloaded = updateInfo.status === 'downloaded'
  const isAvailable = updateInfo.status === 'available'

  // Only show banner for available, downloading, or downloaded states
  if (!isAvailable && !isDownloading && !isDownloaded) return null

  const handleDismiss = () => {
    if (updateInfo.version) {
      dismissVersion(updateInfo.version)
    }
  }

  const handleUpdate = () => {
    downloadAndInstall.mutate()
  }

  const downloadPercent = updateInfo.progress?.percent ?? 0

  return (
    <div className="bg-primary/10 border-b border-primary/20 px-4 py-2">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <RefreshCw className="h-4 w-4 text-primary shrink-0" />
          <div className="min-w-0">
            {isDownloading ? (
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-foreground">
                  Downloading update {updateInfo.version}...
                </span>
                <div className="w-32">
                  <Progress value={downloadPercent} className="h-1.5" />
                </div>
                <span className="text-xs text-muted-foreground">
                  {Math.round(downloadPercent)}%
                </span>
              </div>
            ) : isDownloaded ? (
              <span className="text-sm font-medium text-foreground">
                Update {updateInfo.version} ready to install
              </span>
            ) : (
              <span className="text-sm font-medium text-foreground">
                Update {updateInfo.version} is available
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {(isAvailable || isDownloaded) && (
            <Button
              size="sm"
              variant="default"
              onClick={handleUpdate}
              disabled={downloadAndInstall.isPending}
            >
              {isDownloaded ? (
                <>
                  <RotateCcw className="h-4 w-4 mr-1" />
                  Restart to Update
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-1" />
                  Update
                </>
              )}
            </Button>
          )}

          {!isDownloading && (
            <Button
              size="sm"
              variant="ghost"
              onClick={handleDismiss}
              className="h-8 w-8 p-0"
            >
              <X className="h-4 w-4" />
              <span className="sr-only">Dismiss</span>
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
