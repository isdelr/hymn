import { useState, useEffect } from 'react'
import { ModEntry, ServerAsset } from '@/shared/hymn-types'
import { Button } from '@/components/ui/button'
import {
    ChevronLeft,
    Play,
    LayoutGrid,
    Package,
    Box,
    Users,
    Music,
    Monitor
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

// Components
import { AssetGrid } from './AssetGrid'
import { AssetDetails } from './AssetDetails'
import { TemplateGallery } from './TemplateGallery'
import { AssetNameDialog } from './AssetNameDialog'
import { PluginWorkspace } from './PluginWorkspace'

interface ModWorkspaceProps {
    project: ModEntry
    onBack: () => void
}

const NAV_ITEMS = [
    { id: 'all', label: 'Overview', icon: LayoutGrid },
    { id: 'item', label: 'Items', icon: Package },
    { id: 'block', label: 'Blocks', icon: Box },
    { id: 'entity', label: 'Entities', icon: Users },
    { id: 'audio', label: 'Audio', icon: Music },
    { id: 'ui', label: 'Interface', icon: Monitor },
]

export function ModWorkspace({ project, onBack }: ModWorkspaceProps) {
    // Plugin projects use a dedicated workspace with Java source editing
    if (project.type === 'plugin') {
        return <PluginWorkspace project={project} onBack={onBack} />
    }

    // Navigation State
    const [activeCategory, setActiveCategory] = useState<string>('all')
    const [selectedAsset, setSelectedAsset] = useState<ServerAsset | null>(null)

    // Modals
    const [isTemplateGalleryOpen, setIsTemplateGalleryOpen] = useState(false)
    const [isNameDialogOpen, setIsNameDialogOpen] = useState(false)
    const [pendingTemplate, setPendingTemplate] = useState<any>(null)
    const [assetToRename, setAssetToRename] = useState<ServerAsset | null>(null)

    // Data
    const [assets, setAssets] = useState<ServerAsset[]>([])
    const [isLoading, setIsLoading] = useState(true)

    const loadAssets = async () => {
        setIsLoading(true)
        try {
            const result = await window.hymn.listServerAssets({ path: project.path })
            setAssets(result.assets)
        } catch (error) {
            console.error('Failed to load assets:', error)
            toast.error('Could not load project assets')
        } finally {
            setIsLoading(false)
        }
    }

    useEffect(() => {
        loadAssets()
    }, [project.path])

    const handleAssetSelect = (asset: ServerAsset) => {
        setSelectedAsset(asset)
    }

    const handleTemplateSelect = (template: any) => {
        setIsTemplateGalleryOpen(false)
        setPendingTemplate(template)
        setIsNameDialogOpen(true)
    }

    const handleCreateAsset = async (name: string) => {
        if (!pendingTemplate) return

        try {
            // Determine destination based on category mapping
            let subfolder = 'Items'
            if (pendingTemplate.category === 'Blocks') subfolder = 'Blocks'
            if (pendingTemplate.category === 'Entities') subfolder = 'Entity'
            if (pendingTemplate.category === 'Audio') subfolder = 'Audio'

            const result = await window.hymn.createServerAsset({
                path: project.path,
                destination: `Server/${subfolder}`,
                name: name,
                template: pendingTemplate.id
            })

            if (result.success) {
                toast.success(`${pendingTemplate.label} created!`)
                await loadAssets()
                setSelectedAsset(result.asset)
            }
        } catch (err) {
            console.error(err)
            toast.error('Failed to create asset')
        } finally {
            setPendingTemplate(null)
        }
    }

    const handleDeleteAsset = async (asset: ServerAsset) => {
        if (!confirm(`Are you sure you want to delete ${asset.name}?`)) return
        try {
            await window.hymn.deleteServerAsset({ path: project.path, relativePath: asset.relativePath })
            toast.success('Asset deleted')
            loadAssets()
        } catch (error) {
            toast.error('Failed to delete asset')
        }
    }

    const handleRevealInExplorer = async (asset: ServerAsset) => {
        await window.hymn.openInExplorer(asset.absolutePath)
    }

    const handleRenameRequest = (asset: ServerAsset) => {
        setAssetToRename(asset)
        setIsNameDialogOpen(true)
    }

    const handleConfirmRename = async (newName: string) => {
        if (!assetToRename) return
        try {
            if (newName === assetToRename.name.replace(/\.[^/.]+$/, "")) return

            const oldPath = assetToRename.relativePath
            const lastDotIndex = oldPath.lastIndexOf('.')
            const extension = lastDotIndex !== -1 ? oldPath.substring(lastDotIndex) : ''
            const directory = oldPath.substring(0, oldPath.lastIndexOf('/'))
            const newPath = `${directory}/${newName}${extension}`

            await window.hymn.moveServerAsset({
                path: project.path,
                source: oldPath,
                destination: newPath // renaming is moving
            })
            toast.success('Asset renamed')
            loadAssets()
        } catch (error) {
            toast.error('Failed to rename asset')
            console.error(error)
        }
    }

    return (
        <div className="flex flex-col h-[calc(100vh-6rem)] bg-background -mx-6 -my-6">
            {/* Top Navigation Header */}
            <header className="flex items-center justify-between px-6 py-4 bg-background z-20">
                <div className="flex items-center gap-6">
                    <div className="flex items-center gap-4">
                        <Button variant="ghost" size="icon" onClick={() => {
                            if (selectedAsset) setSelectedAsset(null)
                            else onBack()
                        }} className="h-9 w-9">
                            <ChevronLeft className="h-5 w-5" />
                        </Button>
                        <div>
                            <h1 className="text-lg font-bold tracking-tight">{project.name}</h1>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <Badge variant="outline" className="h-4 px-1.5 text-[9px] uppercase tracking-wider rounded-sm">
                                    {project.type}
                                </Badge>
                                <span>v{project.version || '1.0.0'}</span>
                            </div>
                        </div>
                    </div>

                    <div className="h-8 w-px bg-border/50 mx-2" />

                    {/* Category Navigation Tabs */}
                    <nav className="flex items-center gap-1">
                        {NAV_ITEMS.map((item) => {
                            const Icon = item.icon
                            const isActive = activeCategory === item.id && !selectedAsset
                            return (
                                <button
                                    key={item.id}
                                    onClick={() => {
                                        setActiveCategory(item.id)
                                        setSelectedAsset(null)
                                    }}
                                    className={cn(
                                        "flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors",
                                        isActive
                                            ? "bg-primary/10 text-primary"
                                            : "text-muted-foreground hover:bg-muted hover:text-foreground"
                                    )}
                                >
                                    <Icon className="h-4 w-4" />
                                    <span>{item.label}</span>
                                </button>
                            )
                        })}
                    </nav>
                </div>

                <div className="flex items-center gap-3">
                    <Button
                        variant="outline"
                        size="sm"
                        className="gap-2 font-semibold"
                        onClick={async () => {
                            toast.info('Building mod package...')
                            try {
                                await window.hymn.buildMod({ path: project.path })
                                toast.success('Build complete!')
                            } catch (err) {
                                toast.error('Build failed. Check Gradle output.')
                            }
                        }}
                    >
                        <Play className="h-3.5 w-3.5 fill-current" />
                        Build
                    </Button>
                </div>
            </header>

            {/* Main Content Area */}
            <main className="flex-1 overflow-hidden relative bg-muted/5">
                {isLoading ? (
                    <div className="flex-1 h-full flex flex-col items-center justify-center gap-4 text-muted-foreground">
                        <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                        <p className="text-xs font-bold uppercase tracking-widest text-primary">Scanning Project...</p>
                    </div>
                ) : selectedAsset ? (
                    <AssetDetails
                        asset={selectedAsset}
                        onBack={() => setSelectedAsset(null)}
                    />
                ) : (
                    <AssetGrid
                        category={activeCategory}
                        assets={assets}
                        onAssetSelect={handleAssetSelect}
                        onAddNew={() => setIsTemplateGalleryOpen(true)}
                        onDelete={handleDeleteAsset}
                        onRename={handleRenameRequest}
                        onReveal={handleRevealInExplorer}
                    />
                )}
            </main>

            {/* Dialogs */}
            <TemplateGallery
                isOpen={isTemplateGalleryOpen}
                onClose={() => setIsTemplateGalleryOpen(false)}
                onSelect={handleTemplateSelect}
                category={activeCategory}
            />

            <AssetNameDialog
                isOpen={isNameDialogOpen}
                onClose={() => {
                    setIsNameDialogOpen(false)
                    setAssetToRename(null)
                }}
                onConfirm={(name) => {
                    if (assetToRename) {
                        handleConfirmRename(name)
                    } else {
                        handleCreateAsset(name)
                    }
                }}
                templateLabel={assetToRename ? 'Asset' : (pendingTemplate?.label || 'Asset')}
                initialValue={assetToRename?.name.replace(/\.[^/.]+$/, "") || ''}
            />
        </div>
    )
}
