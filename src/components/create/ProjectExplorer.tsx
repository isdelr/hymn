import { useState } from 'react'
import {
    Package,
    Box,
    Users,
    Music,
    Monitor,
    LayoutGrid,
    ChevronDown,
    ChevronRight,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { ServerAssetKind } from '@/shared/hymn-types'
import { FileExplorer } from './FileExplorer'
import { Separator } from '@/components/ui/separator'

interface ProjectExplorerProps {
    rootPath: string
    activeCategory: string
    onCategoryChange: (category: string) => void
    onFileSelect: (path: string) => void
}

const ASSET_CATEGORIES: { id: ServerAssetKind | 'all', label: string, icon: any }[] = [
    { id: 'all', label: 'Overview', icon: LayoutGrid },
    { id: 'item', label: 'Items', icon: Package },
    { id: 'block', label: 'Blocks', icon: Box },
    { id: 'entity', label: 'Entities', icon: Users },
    { id: 'audio', label: 'Audio', icon: Music },
    { id: 'ui', label: 'Interface', icon: Monitor },
]

export function ProjectExplorer({ rootPath, activeCategory, onCategoryChange, onFileSelect }: ProjectExplorerProps) {
    const [isFileTreeOpen, setIsFileTreeOpen] = useState(false)

    return (
        <div className="flex flex-col h-full bg-muted/5 select-none">
            {/* Asset Categories Section */}
            <div className="p-2 space-y-0.5">
                <div className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/50">
                    Assets
                </div>
                {ASSET_CATEGORIES.map((cat) => {
                    const Icon = cat.icon
                    const isActive = activeCategory === cat.id && !isFileTreeOpen

                    return (
                        <button
                            key={cat.id}
                            onClick={() => {
                                onCategoryChange(cat.id)
                                setIsFileTreeOpen(false)
                            }}
                            className={cn(
                                "w-full flex items-center gap-2.5 px-3 py-1.5 rounded-md text-sm relative group",
                                isActive
                                    ? "bg-primary/10 text-primary font-medium"
                                    : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                            )}
                        >
                            <Icon className={cn(
                                "h-4 w-4",
                                isActive ? "text-primary" : "text-muted-foreground/60 group-hover:text-muted-foreground"
                            )} />
                            <span>{cat.label}</span>
                        </button>
                    )
                })}
            </div>

            <Separator className="my-2 bg-border/40" />

            {/* File System Section */}
            <div className="flex-1 flex flex-col min-h-0">
                <button
                    onClick={() => setIsFileTreeOpen(!isFileTreeOpen)}
                    className="flex items-center gap-1 px-4 py-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/50 hover:text-foreground"
                >
                    {isFileTreeOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                    <span>Source Files</span>
                </button>

                <div className={cn(
                    "flex-1 overflow-hidden",
                    isFileTreeOpen ? "opacity-100" : "opacity-0 h-0 hidden"
                )}>
                    <FileExplorer
                        rootPath={rootPath}
                        onFileSelect={(path) => {
                            onFileSelect(path)
                            setIsFileTreeOpen(true)
                            // Optionally clear active category visual state if files are selected
                        }}
                    />
                </div>
            </div>
        </div>
    )
}
