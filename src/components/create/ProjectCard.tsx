import type { ProjectEntry } from '@/shared/hymn-types'
import { Badge } from '@/components/ui/badge'
import { FolderOpen, Package, Puzzle, CheckCircle, HardDrive } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ProjectCardProps {
    project: ProjectEntry
    onOpen: (project: ProjectEntry) => void
    onExplore: (path: string) => void
}

const formatSize = (bytes: number | undefined): string | null => {
    if (bytes === undefined) return null
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function ProjectCard({ project, onOpen, onExplore }: ProjectCardProps) {
    const isPlugin = project.type === 'plugin'
    const ProjectIcon = isPlugin ? Puzzle : Package

    return (
        <div
            className={cn(
                'group relative overflow-hidden rounded-xl border border-border/40 bg-card/80 cursor-pointer transition-colors duration-200',
                'hover:border-primary/60 hover:bg-card'
            )}
            onClick={() => onOpen(project)}
        >
            <div className="p-4">
                {/* Header row: Icon, Name, Folder button */}
                <div className="flex items-center gap-3">
                    <div className={cn(
                        'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg',
                        isPlugin ? 'bg-primary/10' : 'bg-primary/10'
                    )}>
                        <ProjectIcon className="h-4 w-4 text-primary" />
                    </div>

                    <div className="min-w-0 flex-1">
                        <h3 className="truncate font-medium text-sm">{project.name}</h3>
                        {project.description ? (
                            <p className="truncate text-xs text-muted-foreground mt-0.5">
                                {project.description}
                            </p>
                        ) : project.group ? (
                            <p className="truncate text-xs text-muted-foreground mt-0.5">
                                {project.group}
                            </p>
                        ) : null}
                    </div>

                    {/* Folder button */}
                    <button
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                        onClick={(e) => {
                            e.stopPropagation()
                            onExplore(project.path)
                        }}
                        title="Open in Explorer"
                    >
                        <FolderOpen className="h-4 w-4" />
                    </button>
                </div>

                {/* Info row: Type, Version, Size, Installed status */}
                <div className="mt-3 flex items-center gap-2">
                    <Badge variant="outline" className="text-[10px] font-medium bg-muted/50">
                        {isPlugin ? 'Plugin' : 'Pack'}
                    </Badge>

                    {project.version && (
                        <span className="text-[10px] text-muted-foreground">
                            v{project.version}
                        </span>
                    )}

                    {formatSize(project.size) && (
                        <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                            <HardDrive className="h-3 w-3" />
                            <span>{formatSize(project.size)}</span>
                        </div>
                    )}

                    <div className="flex-1" />

                    {project.isInstalled && (
                        <div className="flex items-center gap-1 text-success">
                            <CheckCircle className="h-3 w-3" />
                            <span className="text-[10px] font-medium">Installed</span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
