import { useState, useMemo } from 'react'
import { JavaSourceFile } from '@/shared/hymn-types'
import { Button } from '@/components/ui/button'
import {
    ChevronRight,
    ChevronDown,
    FileCode,
    FolderOpen,
    Folder,
    Plus,
    Trash2,
    MoreVertical,
    RefreshCw,
    Pencil
} from 'lucide-react'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'

interface PackageNode {
    name: string
    fullName: string
    files: JavaSourceFile[]
    children: Map<string, PackageNode>
}

interface SourceExplorerProps {
    sources: JavaSourceFile[]
    basePackage: string
    selectedFile: JavaSourceFile | null
    onFileSelect: (file: JavaSourceFile) => void
    onAddClass: () => void
    onDeleteFile: (file: JavaSourceFile) => void
    onRenameFile: (file: JavaSourceFile) => void
    onDeletePackage: (packagePath: string) => void
    onRenamePackage: (packagePath: string) => void
    onRefresh: () => void
    isLoading: boolean
}

function buildPackageTree(sources: JavaSourceFile[], basePackage: string): PackageNode {
    const root: PackageNode = {
        name: basePackage,
        fullName: basePackage,
        files: [],
        children: new Map(),
    }

    for (const file of sources) {
        // Determine relative package path from base
        const relativePkg = file.packageName.startsWith(basePackage + '.')
            ? file.packageName.slice(basePackage.length + 1)
            : file.packageName === basePackage
                ? ''
                : file.packageName

        if (!relativePkg) {
            // File is in the root package
            root.files.push(file)
        } else {
            // Navigate/create sub-packages
            const parts = relativePkg.split('.')
            let current = root
            let currentFullName = basePackage

            for (const part of parts) {
                currentFullName = `${currentFullName}.${part}`
                if (!current.children.has(part)) {
                    current.children.set(part, {
                        name: part,
                        fullName: currentFullName,
                        files: [],
                        children: new Map(),
                    })
                }
                current = current.children.get(part)!
            }
            current.files.push(file)
        }
    }

    return root
}

interface PackageTreeItemProps {
    node: PackageNode
    depth: number
    basePackage: string
    selectedFile: JavaSourceFile | null
    onFileSelect: (file: JavaSourceFile) => void
    onDeleteFile: (file: JavaSourceFile) => void
    onRenameFile: (file: JavaSourceFile) => void
    onDeletePackage: (packagePath: string) => void
    onRenamePackage: (packagePath: string) => void
    isRoot?: boolean
}

function PackageTreeItem({
    node,
    depth,
    basePackage,
    selectedFile,
    onFileSelect,
    onDeleteFile,
    onRenameFile,
    onDeletePackage,
    onRenamePackage,
    isRoot = false
}: PackageTreeItemProps) {
    const [isExpanded, setIsExpanded] = useState(true)
    const hasContent = node.files.length > 0 || node.children.size > 0

    const childNodes = Array.from(node.children.values()).sort((a, b) =>
        a.name.localeCompare(b.name)
    )

    const sortedFiles = [...node.files].sort((a, b) =>
        a.className.localeCompare(b.className)
    )

    // Get the relative package path from the base package
    const getRelativePackagePath = () => {
        if (node.fullName === basePackage) return ''
        if (node.fullName.startsWith(basePackage + '.')) {
            return node.fullName.slice(basePackage.length + 1)
        }
        return node.fullName
    }

    return (
        <div>
            {/* Package folder */}
            {!isRoot && (
                <div className="group flex items-center">
                    <button
                        className={cn(
                            "flex items-center gap-2 flex-1 px-2 py-1.5 hover:bg-muted/50 rounded text-sm",
                            "text-muted-foreground"
                        )}
                        style={{ paddingLeft: `${depth * 12 + 8}px` }}
                        onClick={() => setIsExpanded(!isExpanded)}
                    >
                        {hasContent ? (
                            isExpanded ? (
                                <ChevronDown className="h-3.5 w-3.5 flex-shrink-0" />
                            ) : (
                                <ChevronRight className="h-3.5 w-3.5 flex-shrink-0" />
                            )
                        ) : (
                            <span className="w-3.5" />
                        )}
                        {isExpanded ? (
                            <FolderOpen className="h-4 w-4 text-amber-500 flex-shrink-0" />
                        ) : (
                            <Folder className="h-4 w-4 text-amber-500 flex-shrink-0" />
                        )}
                        <span className="truncate">{node.name}</span>
                    </button>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 opacity-0 group-hover:opacity-100 mr-1"
                                onClick={(e) => e.stopPropagation()}
                            >
                                <MoreVertical className="h-3.5 w-3.5" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem
                                onClick={() => onRenamePackage(getRelativePackagePath())}
                            >
                                <Pencil className="h-4 w-4 mr-2" />
                                Rename
                            </DropdownMenuItem>
                            <DropdownMenuItem
                                className="text-destructive focus:text-destructive"
                                onClick={() => onDeletePackage(getRelativePackagePath())}
                            >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            )}

            {/* Children */}
            {(isRoot || isExpanded) && (
                <div>
                    {/* Sub-packages */}
                    {childNodes.map((child) => (
                        <PackageTreeItem
                            key={child.fullName}
                            node={child}
                            depth={isRoot ? depth : depth + 1}
                            basePackage={basePackage}
                            selectedFile={selectedFile}
                            onFileSelect={onFileSelect}
                            onDeleteFile={onDeleteFile}
                            onRenameFile={onRenameFile}
                            onDeletePackage={onDeletePackage}
                            onRenamePackage={onRenamePackage}
                        />
                    ))}

                    {/* Files in this package */}
                    {sortedFiles.map((file) => (
                        <div
                            key={file.id}
                            className="group flex items-center"
                        >
                            <button
                                className={cn(
                                    "flex items-center gap-2 flex-1 px-2 py-1.5 hover:bg-muted/50 rounded text-sm",
                                    selectedFile?.id === file.id && "bg-primary/10 text-primary"
                                )}
                                style={{ paddingLeft: `${(isRoot ? depth : depth + 1) * 12 + 20}px` }}
                                onClick={() => onFileSelect(file)}
                            >
                                <FileCode className="h-4 w-4 text-blue-500 flex-shrink-0" />
                                <span className="truncate">{file.className}</span>
                            </button>
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-6 w-6 opacity-0 group-hover:opacity-100 mr-1"
                                    >
                                        <MoreVertical className="h-3.5 w-3.5" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <DropdownMenuItem
                                        onClick={() => onRenameFile(file)}
                                    >
                                        <Pencil className="h-4 w-4 mr-2" />
                                        Rename
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                        className="text-destructive focus:text-destructive"
                                        onClick={() => onDeleteFile(file)}
                                    >
                                        <Trash2 className="h-4 w-4 mr-2" />
                                        Delete
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}

export function SourceExplorer({
    sources,
    basePackage,
    selectedFile,
    onFileSelect,
    onAddClass,
    onDeleteFile,
    onRenameFile,
    onDeletePackage,
    onRenamePackage,
    onRefresh,
    isLoading
}: SourceExplorerProps) {
    const tree = useMemo(
        () => buildPackageTree(sources, basePackage),
        [sources, basePackage]
    )

    return (
        <div className="flex flex-col h-full border-r bg-card/30">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b">
                <div className="flex items-center gap-2">
                    <FileCode className="h-4 w-4 text-primary" />
                    <span className="font-semibold text-sm">Source Files</span>
                </div>
                <div className="flex items-center gap-1">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={onRefresh}
                        disabled={isLoading}
                        className="h-7 w-7"
                    >
                        <RefreshCw className={cn("h-3.5 w-3.5", isLoading && "animate-spin")} />
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={onAddClass}
                        className="h-7 w-7"
                    >
                        <Plus className="h-4 w-4" />
                    </Button>
                </div>
            </div>

            {/* Tree */}
            <div className="flex-1 overflow-y-auto py-2 custom-scrollbar">
                {isLoading ? (
                    <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
                        <RefreshCw className="h-5 w-5 animate-spin mb-2" />
                        <span className="text-xs">Loading...</span>
                    </div>
                ) : sources.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-32 px-4 text-center">
                        <FileCode className="h-8 w-8 text-muted-foreground/50 mb-2" />
                        <p className="text-xs text-muted-foreground">
                            No Java classes yet
                        </p>
                        <Button
                            variant="link"
                            size="sm"
                            onClick={onAddClass}
                            className="mt-2 text-xs"
                        >
                            Create your first class
                        </Button>
                    </div>
                ) : (
                    <PackageTreeItem
                        node={tree}
                        depth={0}
                        basePackage={basePackage}
                        selectedFile={selectedFile}
                        onFileSelect={onFileSelect}
                        onDeleteFile={onDeleteFile}
                        onRenameFile={onRenameFile}
                        onDeletePackage={onDeletePackage}
                        onRenamePackage={onRenamePackage}
                        isRoot
                    />
                )}
            </div>

            {/* Footer */}
            <div className="px-4 py-2 border-t bg-muted/20">
                <p className="text-[10px] text-muted-foreground font-mono truncate">
                    {basePackage}
                </p>
            </div>
        </div>
    )
}
