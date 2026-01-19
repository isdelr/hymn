import { useState, useCallback } from 'react'
import { useNavigate } from '@tanstack/react-router'
import type { ProjectEntry, ServerAsset, ServerAssetTemplate, BuildPackResult, FileChangeEvent } from '@/shared/hymn-types'
import { Button } from '@/components/ui/button'
import {
    ChevronLeft,
    LayoutGrid,
    Package,
    Box,
    Users,
    Music,
    Monitor,
    Play,
    Archive,
    Settings,
    Languages,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { useDirtyFilesStore } from '@/stores'
import { UnsavedChangesDialog } from '@/components/ui/UnsavedChangesDialog'

// Components
import { AssetGrid } from './AssetGrid'
import { AssetDetails } from './AssetDetails'
import { TemplateGallery } from './TemplateGallery'
import { AssetNameDialog } from './AssetNameDialog'
import { PluginWorkspace } from './PluginWorkspace'
import { BuildOutputDialog } from './BuildOutputDialog'
import { BuildsPanel } from './BuildsPanel'
import { ProjectSettingsDialog } from './ProjectSettingsDialog'
import { TranslationsEditor } from './TranslationsEditor'

// React Query hooks
import { useAssets, useProjects } from '@/hooks/queries'
import { useFileWatcher } from '@/hooks/useFileWatcher'
import {
    useCreateAsset,
    useDeleteAsset,
    useRenameAsset,
    useBuildPack,
    useRevealBuildArtifact,
} from '@/hooks/mutations'

interface ModWorkspaceProps {
    project: ProjectEntry
    onBack?: () => void
    onProjectUpdated?: () => void
}

const NAV_ITEMS = [
    { id: 'all', label: 'Overview', icon: LayoutGrid },
    { id: 'item', label: 'Items', icon: Package },
    { id: 'block', label: 'Blocks', icon: Box },
    { id: 'entity', label: 'Entities', icon: Users },
    { id: 'audio', label: 'Audio', icon: Music },
    { id: 'ui', label: 'Interface', icon: Monitor },
    { id: 'translations', label: 'Translations', icon: Languages },
    { id: 'builds', label: 'Builds', icon: Archive },
]

export function ModWorkspace({ project, onBack, onProjectUpdated }: ModWorkspaceProps) {
    const navigate = useNavigate()

    // React Query data - always call hooks unconditionally
    const { data: assets = [], isLoading } = useAssets(project.type !== 'plugin' ? project.path : null)
    const { refetch: refetchProjects } = useProjects()

    // Mutations - always call hooks unconditionally
    const createAsset = useCreateAsset()
    const deleteAsset = useDeleteAsset()
    const renameAsset = useRenameAsset()
    const buildPack = useBuildPack()
    const revealArtifact = useRevealBuildArtifact()

    // Navigation State
    const [activeCategory, setActiveCategory] = useState<string>('all')
    const [selectedAsset, setSelectedAsset] = useState<ServerAsset | null>(null)

    // Modals
    const [isTemplateGalleryOpen, setIsTemplateGalleryOpen] = useState(false)
    const [isNameDialogOpen, setIsNameDialogOpen] = useState(false)
    const [pendingTemplate, setPendingTemplate] = useState<{ id: ServerAssetTemplate; label: string; category: string } | null>(null)
    const [assetToRename, setAssetToRename] = useState<ServerAsset | null>(null)

    // Build output dialog state
    const [buildResult, setBuildResult] = useState<BuildPackResult | null>(null)
    const [showBuildDialog, setShowBuildDialog] = useState(false)

    // Project settings dialog state
    const [showSettingsDialog, setShowSettingsDialog] = useState(false)

    // File watcher - handles external file changes and auto-refreshes data
    const handleAssetChange = useCallback((event: FileChangeEvent) => {
        // Only clear selection if the asset was deleted or renamed, not on regular saves
        if (selectedAsset && event.filePath === selectedAsset.absolutePath && event.eventType === 'rename') {
            setSelectedAsset(null)
        }
    }, [selectedAsset])

    // Only watch non-plugin projects (plugins are handled by PluginWorkspace)
    useFileWatcher({
        projectPath: project.type !== 'plugin' ? project.path : null,
        onAssetChange: handleAssetChange,
    })

    // Dirty files tracking
    const hasAnyDirtyFiles = useDirtyFilesStore((s) => s.hasAnyDirtyFiles)
    const clearAllDirtyFiles = useDirtyFilesStore((s) => s.clearAllDirtyFiles)
    const getDirtyFilePaths = useDirtyFilesStore((s) => s.getDirtyFilePaths)
    const [showUnsavedDialog, setShowUnsavedDialog] = useState(false)
    const [pendingNavigation, setPendingNavigation] = useState<(() => void) | null>(null)

    const handleNavigateBack = () => {
        navigate({ to: '/create' })
        onBack?.()
    }

    // Plugin projects use a dedicated workspace with Java source editing
    if (project.type === 'plugin') {
        return <PluginWorkspace project={project} onBack={handleNavigateBack} onProjectUpdated={onProjectUpdated} />
    }

    const isBuilding = buildPack.isPending

    const attemptNavigation = (navigationFn: () => void) => {
        if (hasAnyDirtyFiles()) {
            setPendingNavigation(() => navigationFn)
            setShowUnsavedDialog(true)
        } else {
            navigationFn()
        }
    }

    const handleDiscardAndNavigate = () => {
        clearAllDirtyFiles()
        setShowUnsavedDialog(false)
        if (pendingNavigation) {
            pendingNavigation()
            setPendingNavigation(null)
        }
    }

    const handleAssetSelect = (asset: ServerAsset) => {
        setSelectedAsset(asset)
    }

    const handleTemplateSelect = (template: { id: ServerAssetTemplate; label: string; category: string }) => {
        setIsTemplateGalleryOpen(false)
        setPendingTemplate(template)
        setIsNameDialogOpen(true)
    }

    const handleCreateAsset = async (name: string) => {
        if (!pendingTemplate) return

        // Determine destination based on category mapping
        // Hytale expects Server assets under Server/<Category>/<SubCategory>/ paths
        // e.g., Server/Item/Items/, Server/Block/Blocks/, Server/Entity/Entities/
        let subfolder = 'Item/Items'
        if (pendingTemplate.category === 'Blocks') subfolder = 'Block/Blocks'
        if (pendingTemplate.category === 'Entities') subfolder = 'Entity/Entities'
        if (pendingTemplate.category === 'Audio') subfolder = 'Audio/Sounds'

        const result = await createAsset.mutateAsync({
            projectPath: project.path,
            destination: `Server/${subfolder}`,
            name: name,
            template: pendingTemplate.id
        })

        if (result.result.success) {
            setSelectedAsset(result.result.asset)
        }
        setPendingTemplate(null)
    }

    const handleDeleteAsset = async (asset: ServerAsset) => {
        if (!confirm(`Are you sure you want to delete ${asset.name}?`)) return
        await deleteAsset.mutateAsync({ projectPath: project.path, asset })
        if (selectedAsset?.id === asset.id) {
            setSelectedAsset(null)
        }
    }

    const handleRevealInExplorer = async (asset: ServerAsset) => {
        await window.hymn.openInExplorer(asset.absolutePath)
    }

    const handleRenameRequest = (asset: ServerAsset) => {
        setAssetToRename(asset)
        setIsNameDialogOpen(true)
    }

    const handleBuild = async () => {
        const result = await buildPack.mutateAsync({ projectPath: project.path })
        setBuildResult(result)
        setShowBuildDialog(true)
    }

    const handleRevealBuildArtifact = (artifact: { outputPath: string; id: string }) => {
        revealArtifact.mutate(artifact.id)
    }

    const handleConfirmRename = async (newName: string) => {
        if (!assetToRename) return
        if (newName === assetToRename.name.replace(/\.[^/.]+$/, "")) return

        await renameAsset.mutateAsync({
            projectPath: project.path,
            asset: assetToRename,
            newName,
        })
    }

    return (
        <div className="flex flex-col h-[calc(100vh-6rem)] bg-background -mx-6 -my-6">
            {/* Top Navigation Header */}
            <header className="flex items-center justify-between px-6 py-4 bg-background z-20">
                <div className="flex items-center gap-6">
                    <div className="flex items-center gap-4">
                        <Button variant="ghost" size="icon" onClick={() => {
                            if (selectedAsset) {
                                setSelectedAsset(null)
                            } else {
                                attemptNavigation(() => {
                                    clearAllDirtyFiles()
                                    handleNavigateBack()
                                })
                            }
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
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setShowSettingsDialog(true)}
                            className="h-8 w-8 text-muted-foreground hover:text-foreground"
                        >
                            <Settings className="h-4 w-4" />
                        </Button>
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
                    {/* Build Button (creates ZIP in builds folder) */}
                    <Button
                        variant="outline"
                        size="sm"
                        className="gap-2 font-semibold"
                        onClick={handleBuild}
                        disabled={isBuilding}
                    >
                        <Play className={cn("h-3.5 w-3.5 fill-current", isBuilding && "animate-pulse")} />
                        {isBuilding ? 'Building...' : 'Build'}
                    </Button>
                </div>
            </header>

            {/* Main Content Area */}
            <main className="flex-1 overflow-hidden relative bg-muted/5">
                {activeCategory === 'builds' ? (
                    <div className="p-6 overflow-auto h-full">
                        <BuildsPanel projectName={project.name} />
                    </div>
                ) : activeCategory === 'translations' ? (
                    <TranslationsEditor packPath={project.path} />
                ) : isLoading ? (
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

            {/* Unsaved Changes Dialog */}
            <UnsavedChangesDialog
                isOpen={showUnsavedDialog}
                onClose={() => {
                    setShowUnsavedDialog(false)
                    setPendingNavigation(null)
                }}
                onDiscard={handleDiscardAndNavigate}
                fileCount={getDirtyFilePaths().length}
            />

            {/* Build Output Dialog */}
            <BuildOutputDialog
                isOpen={showBuildDialog}
                onClose={() => setShowBuildDialog(false)}
                result={buildResult}
                type="pack"
                onRevealArtifact={buildResult?.artifact ? handleRevealBuildArtifact : undefined}
            />

            {/* Project Settings Dialog */}
            <ProjectSettingsDialog
                isOpen={showSettingsDialog}
                onClose={() => setShowSettingsDialog(false)}
                projectPath={project.path}
                projectFormat={project.format}
                onSaved={() => {
                    refetchProjects()
                    onProjectUpdated?.()
                }}
            />
        </div>
    )
}
