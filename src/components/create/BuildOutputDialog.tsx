import { CheckCircle2, XCircle, Clock, HardDrive, FolderOpen } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import type { BuildPluginResult, BuildPackResult, BuildArtifact } from '@/shared/hymn-types'
import { cn } from '@/lib/utils'

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`
  return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`
}

interface BuildOutputDialogProps {
  isOpen: boolean
  onClose: () => void
  result: BuildPluginResult | BuildPackResult | null
  type: 'plugin' | 'pack'
  onRevealArtifact?: (artifact: BuildArtifact) => void
}

export function BuildOutputDialog({
  isOpen,
  onClose,
  result,
  type,
  onRevealArtifact,
}: BuildOutputDialogProps) {
  if (!result) return null

  const success = result.success
  const artifact = result.artifact

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {success ? (
              <CheckCircle2 className="h-5 w-5 text-green-500" />
            ) : (
              <XCircle className="h-5 w-5 text-destructive" />
            )}
            {success ? 'Build Successful' : 'Build Failed'}
          </DialogTitle>
          <DialogDescription>
            {type === 'plugin' ? 'Plugin' : 'Asset Pack'} build{' '}
            {success ? 'completed successfully' : 'encountered errors'}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col gap-4">
          {/* Build Stats */}
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span>{formatDuration(result.durationMs)}</span>
            </div>
            {artifact && (
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <HardDrive className="h-4 w-4" />
                <span>{formatFileSize(artifact.fileSize)}</span>
              </div>
            )}
            <Badge
              variant={success ? 'default' : 'destructive'}
              className={cn(
                'ml-auto',
                success && 'bg-green-500/10 text-green-600 border-green-500/20'
              )}
            >
              {success ? 'Success' : 'Failed'}
            </Badge>
          </div>

          {/* Artifact Info */}
          {artifact && (
            <div className="p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-sm">
                    {artifact.projectName}-{artifact.version}.{artifact.artifactType}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">
                    {artifact.outputPath}
                  </p>
                </div>
                {onRevealArtifact && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="gap-1.5 flex-shrink-0"
                    onClick={() => onRevealArtifact(artifact)}
                  >
                    <FolderOpen className="h-3.5 w-3.5" />
                    Reveal
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* Build Output */}
          <div className="flex-1 min-h-0 overflow-hidden">
            <p className="text-xs font-medium text-muted-foreground mb-2">Build Output</p>
            <ScrollArea className="h-[200px] rounded-lg border bg-muted/30">
              <pre className="p-3 text-xs font-mono whitespace-pre-wrap break-all">
                {result.output || 'No output'}
              </pre>
            </ScrollArea>
            {'truncated' in result && result.truncated && (
              <p className="text-xs text-muted-foreground mt-1">
                Output was truncated due to size limits.
              </p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
