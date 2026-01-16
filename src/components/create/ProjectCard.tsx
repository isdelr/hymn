import { ModEntry } from '@/shared/hymn-types'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { FolderOpen, Package, Terminal } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface ProjectCardProps {
    project: ModEntry
    onOpen: (project: ModEntry) => void
    onExplore: (path: string) => void
}

export function ProjectCard({ project, onOpen, onExplore }: ProjectCardProps) {

    return (
        <Card
            className="group relative overflow-hidden border-border/40 bg-card/50 hover:bg-card hover:shadow-lg cursor-pointer"
            onClick={() => onOpen(project)}
        >
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary/50 to-transparent opacity-0 group-hover:opacity-100" />

            <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                    <div className="space-y-1">
                        <CardTitle className="text-base font-bold tracking-tight">
                            {project.name}
                        </CardTitle>
                        <CardDescription className="line-clamp-1 text-xs">
                            {project.group || 'No group'}
                        </CardDescription>
                    </div>
                    <Badge variant="outline" className="bg-primary/5 text-[10px] font-bold uppercase tracking-wider">
                        {project.type}
                    </Badge>
                </div>
            </CardHeader>

            <CardContent>
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                        <Package className="h-3 w-3" />
                        <span>v{project.version || '1.0.0'}</span>
                    </div>
                    {project.format === 'directory' && (
                        <div className="flex items-center gap-1">
                            <Terminal className="h-3 w-3" />
                            <span>Project</span>
                        </div>
                    )}
                </div>

                <div className="mt-4 flex gap-2 opacity-0 group-hover:opacity-100" onClick={(e) => e.stopPropagation()}>
                    <Button
                        variant="secondary"
                        size="sm"
                        className="h-8 flex-1 text-xs font-semibold"
                        onClick={() => onOpen(project)}
                    >
                        Launch Playground
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => onExplore(project.path)}
                    >
                        <FolderOpen className="h-4 w-4" />
                    </Button>
                </div>
            </CardContent>
        </Card>
    )
}
