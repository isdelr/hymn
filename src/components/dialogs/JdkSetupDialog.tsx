import { useState, useEffect } from 'react'
import { Download, FolderOpen, ExternalLink } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { JdkDownloadProgress } from './JdkDownloadProgress'
import type { JdkDownloadProgress as JdkDownloadProgressType } from '@/shared/hymn-types'
import { useDownloadJdk, useSelectJdkPath } from '@/hooks/mutations'

interface JdkSetupDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onComplete?: () => void
}

export function JdkSetupDialog({ open, onOpenChange, onComplete }: JdkSetupDialogProps) {
  const [downloadProgress, setDownloadProgress] = useState<JdkDownloadProgressType | null>(null)
  const downloadJdk = useDownloadJdk()
  const selectJdkPath = useSelectJdkPath()

  // Listen for JDK download progress
  useEffect(() => {
    if (!open) return

    const unsubscribe = window.hymnSettings.onJdkDownloadProgress((progress) => {
      setDownloadProgress(progress)
      if (progress.status === 'complete') {
        // Close dialog and trigger callback after success
        setTimeout(() => {
          setDownloadProgress(null)
          onOpenChange(false)
          onComplete?.()
        }, 1500)
      } else if (progress.status === 'error') {
        // Clear error after a delay
        setTimeout(() => setDownloadProgress(null), 3000)
      }
    })
    return unsubscribe
  }, [open, onOpenChange, onComplete])

  const handleDownload = () => {
    downloadJdk.mutate()
  }

  const handleSelectPath = async () => {
    const result = await selectJdkPath.mutateAsync()
    if (result) {
      onOpenChange(false)
      onComplete?.()
    }
  }

  const handleOpenAdoptium = () => {
    window.open('https://adoptium.net/temurin/releases/?version=25', '_blank')
  }

  const isDownloading = downloadProgress?.status === 'downloading' || downloadProgress?.status === 'extracting'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" showCloseButton={!isDownloading}>
        <DialogHeader>
          <DialogTitle>Java Development Kit Required</DialogTitle>
          <DialogDescription>
            A JDK is required to build plugins. Choose how you'd like to set it up.
          </DialogDescription>
        </DialogHeader>

        {downloadProgress && (downloadProgress.status === 'downloading' || downloadProgress.status === 'extracting' || downloadProgress.status === 'complete' || downloadProgress.status === 'error') ? (
          <JdkDownloadProgress progress={downloadProgress} />
        ) : (
          <div className="space-y-3 py-2">
            {/* Option 1: Download */}
            <button
              onClick={handleDownload}
              disabled={downloadJdk.isPending}
              className="w-full flex items-start gap-3 p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors text-left"
            >
              <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-500">
                <Download className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm">Download JDK</div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  Automatically download and install Eclipse Temurin JDK 25
                </div>
                <div className="text-xs text-emerald-500 mt-1">Recommended</div>
              </div>
            </button>

            {/* Option 2: Select Existing */}
            <button
              onClick={handleSelectPath}
              disabled={selectJdkPath.isPending}
              className="w-full flex items-start gap-3 p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors text-left"
            >
              <div className="p-2 rounded-lg bg-blue-500/10 text-blue-500">
                <FolderOpen className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm">Select Existing JDK</div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  Choose a JDK folder already installed on your system
                </div>
              </div>
            </button>

            {/* Option 3: Manual Install */}
            <button
              onClick={handleOpenAdoptium}
              className="w-full flex items-start gap-3 p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors text-left"
            >
              <div className="p-2 rounded-lg bg-orange-500/10 text-orange-500">
                <ExternalLink className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm">Install Manually</div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  Download and install JDK yourself from adoptium.net
                </div>
              </div>
            </button>
          </div>
        )}

        {!isDownloading && !downloadProgress && (
          <div className="flex justify-end">
            <Button variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
