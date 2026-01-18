import { useState } from 'react'
import {
  Package,
  Code,
  Trash2,
  FolderOpen,
  Download,
  Clock,
  HardDrive,
  RefreshCw,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
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
import { useBuildArtifacts } from '@/hooks/queries'
import {
  useDeleteBuildArtifact,
  useClearAllBuildArtifacts,
  useCopyArtifactToMods,
  useRevealBuildArtifact,
  useOpenBuildsFolder,
} from '@/hooks/mutations'
import type { BuildArtifact } from '@/shared/hymn-types'
import { cn } from '@/lib/utils'

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function formatRelativeTime(isoDate: string): string {
  const date = new Date(isoDate)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / (1000 * 60))
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`

  return date.toLocaleDateString()
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`
  return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`
}

// Extract build number from artifact path (e.g., "MyMod-1.0.0-build2.jar" -> 2)
function getBuildNumber(outputPath: string): number | null {
  const filename = outputPath.split(/[/\\]/).pop() || ''
  const match = filename.match(/-build(\d+)\.(jar|zip)$/)
  return match ? parseInt(match[1], 10) : null
}

interface ArtifactCardProps {
  artifact: BuildArtifact
  onDelete: (artifact: BuildArtifact) => void
  onInstall: (artifact: BuildArtifact) => void
  onReveal: (artifact: BuildArtifact) => void
}

function ArtifactCard({ artifact, onDelete, onInstall, onReveal }: ArtifactCardProps) {
  const isPlugin = artifact.artifactType === 'jar'
  const buildNumber = getBuildNumber(artifact.outputPath)

  return (
    <div className="group relative flex items-center gap-4 p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors">
      <div
        className={cn(
          'flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center',
          isPlugin ? 'bg-blue-500/10 text-blue-500' : 'bg-purple-500/10 text-purple-500'
        )}
      >
        {isPlugin ? <Code className="h-5 w-5" /> : <Package className="h-5 w-5" />}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h3 className="font-medium text-sm truncate">{artifact.projectName}</h3>
          <Badge variant="outline" className="h-4 px-1.5 text-[9px] uppercase tracking-wider rounded-sm">
            {artifact.artifactType}
          </Badge>
        </div>
        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
          <span>
            v{artifact.version}
            {buildNumber && (
              <span className="text-muted-foreground/60 ml-1">(build {buildNumber})</span>
            )}
          </span>
          <span className="flex items-center gap-1">
            <HardDrive className="h-3 w-3" />
            {formatFileSize(artifact.fileSize)}
          </span>
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {formatRelativeTime(artifact.builtAt)}
          </span>
          <span className="text-muted-foreground/60">
            ({formatDuration(artifact.durationMs)})
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 gap-1.5"
          onClick={(e) => {
            e.stopPropagation()
            onInstall(artifact)
          }}
        >
          <Download className="h-3.5 w-3.5" />
          Install
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button type="button" variant="ghost" size="icon" className="h-8 w-8">
              <span className="sr-only">More actions</span>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="1" />
                <circle cx="12" cy="5" r="1" />
                <circle cx="12" cy="19" r="1" />
              </svg>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={() => onReveal(artifact)}>
              <FolderOpen className="mr-2 h-4 w-4" />
              Show in Explorer
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onSelect={() => onDelete(artifact)}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
}

interface BuildsPanelProps {
  projectName?: string
}

export function BuildsPanel({ projectName }: BuildsPanelProps) {
  const { data: allArtifacts = [], isLoading, refetch } = useBuildArtifacts()

  // Filter artifacts by project name if provided
  const artifacts = projectName
    ? allArtifacts.filter(a => a.projectName === projectName)
    : allArtifacts
  const deleteArtifact = useDeleteBuildArtifact()
  const clearAllArtifacts = useClearAllBuildArtifacts()
  const copyToMods = useCopyArtifactToMods()
  const revealArtifact = useRevealBuildArtifact()
  const openBuildsFolder = useOpenBuildsFolder()

  const [artifactToDelete, setArtifactToDelete] = useState<BuildArtifact | null>(null)
  const [showClearAllDialog, setShowClearAllDialog] = useState(false)

  const handleDelete = (artifact: BuildArtifact) => {
    setArtifactToDelete(artifact)
  }

  const confirmDelete = async () => {
    if (!artifactToDelete) return
    await deleteArtifact.mutateAsync({ artifactId: artifactToDelete.id })
    setArtifactToDelete(null)
  }

  const confirmClearAll = async () => {
    if (projectName) {
      // Delete only this project's artifacts
      for (const artifact of artifacts) {
        await deleteArtifact.mutateAsync({ artifactId: artifact.id })
      }
    } else {
      // Delete all artifacts globally
      await clearAllArtifacts.mutateAsync()
    }
    setShowClearAllDialog(false)
  }

  const handleInstall = (artifact: BuildArtifact) => {
    copyToMods.mutate({ artifactId: artifact.id })
  }

  const handleReveal = (artifact: BuildArtifact) => {
    revealArtifact.mutate(artifact.id)
  }

  // Group artifacts by project
  const groupedArtifacts = artifacts.reduce((acc, artifact) => {
    if (!acc[artifact.projectName]) {
      acc[artifact.projectName] = []
    }
    acc[artifact.projectName].push(artifact)
    return acc
  }, {} as Record<string, BuildArtifact[]>)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
          Build Artifacts
        </h2>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => openBuildsFolder.mutate()}
            className="h-8 gap-2"
          >
            <FolderOpen className="h-4 w-4" />
            Open Folder
          </Button>
          <Button
              variant="ghost"
              size="sm"
              onClick={() => refetch()}
              disabled={isLoading}
              className="h-8 gap-2"
          >
            <RefreshCw className={cn('h-4 w-4', isLoading && 'animate-spin')} />
            Refresh
          </Button>
          {artifacts.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowClearAllDialog(true)}
              className="h-8 gap-2 text-destructive hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
              Delete All
            </Button>
          )}
        </div>
      </div>

      {isLoading && artifacts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 bg-card/20 border border-dashed rounded-xl text-center px-6">
          <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin mb-4" />
          <p className="text-sm text-muted-foreground">Loading builds...</p>
        </div>
      ) : artifacts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 bg-card/20 border border-dashed rounded-xl text-center px-6">
          <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mb-4">
            <Package className="h-7 w-7 text-muted-foreground/50" />
          </div>
          <h3 className="text-base font-medium mb-1">No builds yet</h3>
          <p className="text-sm text-muted-foreground max-w-xs">
            {projectName
              ? 'Build this project to see artifacts here.'
              : 'Build a plugin or package an asset pack to see artifacts here.'}
          </p>
        </div>
      ) : projectName ? (
        // Project-scoped mode: flat list without grouping
        <div className="space-y-2">
          {artifacts.map((artifact) => (
            <ArtifactCard
              key={artifact.id}
              artifact={artifact}
              onDelete={handleDelete}
              onInstall={handleInstall}
              onReveal={handleReveal}
            />
          ))}
        </div>
      ) : (
        // Global mode: group by project
        <div className="space-y-6">
          {Object.entries(groupedArtifacts).map(([groupProjectName, projectArtifacts]) => (
            <div key={groupProjectName} className="space-y-2">
              <h3 className="text-xs font-medium text-muted-foreground px-1">
                {groupProjectName}
              </h3>
              <div className="space-y-2">
                {projectArtifacts.map((artifact) => (
                  <ArtifactCard
                    key={artifact.id}
                    artifact={artifact}
                    onDelete={handleDelete}
                    onInstall={handleInstall}
                    onReveal={handleReveal}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <AlertDialog open={!!artifactToDelete} onOpenChange={() => setArtifactToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Build Artifact</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete{' '}
              <strong>
                {artifactToDelete?.projectName}-{artifactToDelete?.version}.
                {artifactToDelete?.artifactType}
              </strong>
              ? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showClearAllDialog} onOpenChange={setShowClearAllDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {projectName ? `Delete All ${projectName} Builds` : 'Delete All Build Artifacts'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {projectName
                ? `Are you sure you want to delete all ${artifacts.length} build artifact${artifacts.length === 1 ? '' : 's'} for ${projectName}? This action cannot be undone.`
                : `Are you sure you want to delete all ${artifacts.length} build artifact${artifacts.length === 1 ? '' : 's'}? This will permanently remove all JARs and ZIPs from the builds folder. This action cannot be undone.`
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmClearAll}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete All
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
