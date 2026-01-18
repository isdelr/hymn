import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { AlertTriangle } from 'lucide-react'

interface UnsavedChangesDialogProps {
  isOpen: boolean
  onClose: () => void
  onDiscard: () => void
  onSave?: () => Promise<void>
  fileCount?: number
  fileName?: string
}

export function UnsavedChangesDialog({
  isOpen,
  onClose,
  onDiscard,
  onSave,
  fileCount = 1,
  fileName,
}: UnsavedChangesDialogProps) {
  const handleSave = async () => {
    if (onSave) {
      await onSave()
    }
    onClose()
  }

  return (
    <AlertDialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-500/10">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
            </div>
            <div>
              <AlertDialogTitle>Unsaved Changes</AlertDialogTitle>
              <AlertDialogDescription className="mt-1">
                {fileName
                  ? `"${fileName}" has unsaved changes.`
                  : fileCount > 1
                    ? `You have ${fileCount} files with unsaved changes.`
                    : 'You have unsaved changes.'}
              </AlertDialogDescription>
            </div>
          </div>
        </AlertDialogHeader>
        <AlertDialogFooter className="gap-2 sm:gap-2">
          <AlertDialogCancel onClick={onClose}>Cancel</AlertDialogCancel>
          <Button
            variant="destructive"
            onClick={onDiscard}
          >
            Discard
          </Button>
          {onSave && (
            <AlertDialogAction onClick={handleSave}>
              Save
            </AlertDialogAction>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
