import { useEffect, useState } from 'react'
import { Minus, Square, X, Copy } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useDirtyFilesStore } from '@/stores'
import { UnsavedChangesDialog } from '@/components/ui/UnsavedChangesDialog'

export function TitleBar() {
  const [isMaximized, setIsMaximized] = useState(false)
  const [showUnsavedDialog, setShowUnsavedDialog] = useState(false)
  const hasAnyDirtyFiles = useDirtyFilesStore((s) => s.hasAnyDirtyFiles)
  const clearAllDirtyFiles = useDirtyFilesStore((s) => s.clearAllDirtyFiles)
  const getDirtyFilePaths = useDirtyFilesStore((s) => s.getDirtyFilePaths)

  useEffect(() => {
    // Get initial maximize state
    window.hymnWindow.isMaximized().then(setIsMaximized)

    // Listen for maximize state changes
    return window.hymnWindow.onMaximizedChange(setIsMaximized)
  }, [])

  const handleClose = () => {
    if (hasAnyDirtyFiles()) {
      setShowUnsavedDialog(true)
    } else {
      window.hymnWindow.close()
    }
  }

  const handleDiscardAndClose = () => {
    clearAllDirtyFiles()
    setShowUnsavedDialog(false)
    window.hymnWindow.close()
  }

  return (
    <div className="titlebar flex h-8 items-center justify-between bg-sidebar border-b border-border/30">
      {/* Drag region with app branding */}
      <div className="drag-region flex flex-1 items-center gap-2 px-3 h-full">
        <div className="no-drag flex h-5 w-5 items-center justify-center rounded bg-primary text-primary-foreground text-xs font-bold">
          H
        </div>
        <span className="text-xs font-medium text-muted-foreground">Hymn</span>
      </div>

      {/* Window controls */}
      <div className="no-drag flex h-full">
        {/* Minimize */}
        <button
          onClick={() => window.hymnWindow.minimize()}
          className={cn(
            'flex h-full w-11 items-center justify-center',
            'text-muted-foreground hover:bg-accent hover:text-foreground',
            'transition-colors'
          )}
          aria-label="Minimize"
        >
          <Minus className="h-4 w-4" />
        </button>

        {/* Maximize/Restore */}
        <button
          onClick={() => window.hymnWindow.maximize()}
          className={cn(
            'flex h-full w-11 items-center justify-center',
            'text-muted-foreground hover:bg-accent hover:text-foreground',
            'transition-colors'
          )}
          aria-label={isMaximized ? 'Restore' : 'Maximize'}
        >
          {isMaximized ? (
            <Copy className="h-3.5 w-3.5" />
          ) : (
            <Square className="h-3.5 w-3.5" />
          )}
        </button>

        {/* Close */}
        <button
          onClick={handleClose}
          className={cn(
            'flex h-full w-11 items-center justify-center',
            'text-muted-foreground hover:bg-destructive hover:text-white',
            'transition-colors'
          )}
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <UnsavedChangesDialog
        isOpen={showUnsavedDialog}
        onClose={() => setShowUnsavedDialog(false)}
        onDiscard={handleDiscardAndClose}
        fileCount={getDirtyFilePaths().length}
      />
    </div>
  )
}
