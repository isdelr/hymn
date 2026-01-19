import { FileJson, Folder, FolderOpen, MoreVertical, Plus, Loader2 } from 'lucide-react'
import { useState } from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { FileNode } from '@/shared/hymn-types'
import { useProjectFiles } from '@/hooks/queries'

interface FileExplorerProps {
    rootPath: string
    onFileSelect: (path: string) => void
}

export function FileExplorer({ rootPath, onFileSelect }: FileExplorerProps) {
    const { data, isLoading } = useProjectFiles(rootPath)
    const rootNode = data?.root ?? null

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center h-full gap-2 text-muted-foreground opacity-50 text-xs">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading files...
            </div>
        )
    }

    if (!rootNode || !rootNode.children) {
        return (
            <div className="p-4 text-xs text-muted-foreground text-center">
                No files found in project.
            </div>
        )
    }

    return (
        <div className="flex flex-col h-full bg-card/10">
            <div className="p-2 flex items-center justify-between border-b bg-muted/20">
                <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" className="h-6 w-6">
                        <Plus className="h-3 w-3" />
                    </Button>
                </div>
                <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" className="h-6 w-6">
                        <MoreVertical className="h-3 w-3" />
                    </Button>
                </div>
            </div>
            <div className="flex-1 overflow-auto py-2">
                {rootNode.children.map((node) => (
                    <FileExplorerNode key={node.path} node={node} onSelect={onFileSelect} depth={0} />
                ))}
            </div>
        </div>
    )
}

function FileExplorerNode({
    node,
    onSelect,
    depth
}: {
    node: FileNode;
    onSelect: (path: string) => void;
    depth: number
}) {
    const [isOpen, setIsOpen] = useState(depth === 0)
    const isDirectory = node.type === 'directory'

    return (
        <div className="select-none">
            <div
                className={cn(
                    "flex items-center gap-2 px-2 py-1 text-xs cursor-pointer hover:bg-primary/5 transition-colors group",
                    isDirectory ? "text-muted-foreground" : "text-foreground font-medium"
                )}
                style={{ paddingLeft: `${(depth + 1) * 12}px` }}
                onClick={() => {
                    if (isDirectory) setIsOpen(!isOpen)
                    else onSelect(node.path)
                }}
            >
                {isDirectory ? (
                    isOpen ? <FolderOpen className="h-3.5 w-3.5 text-primary/70" /> : <Folder className="h-3.5 w-3.5" />
                ) : (
                    <FileJson className="h-3.5 w-3.5 text-success/70" />
                )}
                <span className="truncate flex-1">{node.name}</span>

                {isDirectory && (
                    <Button variant="ghost" size="icon" className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Plus className="h-2.5 w-2.5" />
                    </Button>
                )}
            </div>

            {isDirectory && isOpen && node.children && (
                <div>
                    {node.children.map((child) => (
                        <FileExplorerNode key={child.path} node={child} onSelect={onSelect} depth={depth + 1} />
                    ))}
                </div>
            )}
        </div>
    )
}
