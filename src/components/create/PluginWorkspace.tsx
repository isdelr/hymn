import { useState } from 'react'
import type { ProjectEntry, JavaSourceFile, ServerAsset, ServerAssetTemplate, BuildPluginResult } from '@/shared/hymn-types'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import {
    ChevronLeft,
    Play,
    Code,
    Package,
    ExternalLink,
    AlertTriangle,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useDirtyFilesStore } from '@/stores'
import { UnsavedChangesDialog } from '@/components/ui/UnsavedChangesDialog'

// Components
import { SourceExplorer } from './SourceExplorer'
import { JavaFileEditor } from './JavaFileEditor'
import { JavaTemplateGallery, JavaTemplate } from './JavaTemplateGallery'
import { JavaClassNameDialog } from './JavaClassNameDialog'
import { AssetGrid } from './AssetGrid'
import { AssetDetails } from './AssetDetails'
import { TemplateGallery } from './TemplateGallery'
import { AssetNameDialog } from './AssetNameDialog'
import { BuildOutputDialog } from './BuildOutputDialog'
import { DependencyStatus } from './DependencyBanner'

// React Query hooks
import { useJavaSources, useAssets, useDependencies } from '@/hooks/queries'
import {
    useCreateJavaClass,
    useDeleteJavaFile,
    useSaveJavaFile,
    useCreateAsset,
    useDeleteAsset,
    useRenameAsset,
    useBuildPlugin,
    useRevealBuildArtifact,
} from '@/hooks/mutations'

interface PluginWorkspaceProps {
    project: ProjectEntry
    onBack: () => void
}

type WorkspaceMode = 'source' | 'assets'

export function PluginWorkspace({ project, onBack }: PluginWorkspaceProps) {
    // Mode: source code vs assets (for plugins with includesAssetPack)
    const [mode, setMode] = useState<WorkspaceMode>('source')

    // React Query data
    const { data: sourceData, isLoading: isLoadingSources, refetch: refetchSources } = useJavaSources(project.path)
    const { data: assets = [], isLoading: isLoadingAssets } = useAssets(
        project.includesAssetPack ? project.path : null
    )
    const { data: dependencies } = useDependencies()

    const sources = sourceData?.sources ?? []
    const basePackage = sourceData?.basePackage ?? ''
    const canBuild = dependencies?.canBuildPlugins ?? false

    // Mutations
    const createJavaClass = useCreateJavaClass()
    const deleteJavaFile = useDeleteJavaFile()
    const saveJavaFile = useSaveJavaFile()
    const createAsset = useCreateAsset()
    const deleteAsset = useDeleteAsset()
    const renameAsset = useRenameAsset()
    const buildPlugin = useBuildPlugin()
    const revealArtifact = useRevealBuildArtifact()

    // Source code state
    const [selectedFile, setSelectedFile] = useState<JavaSourceFile | null>(null)

    // Java class creation modals
    const [isTemplateGalleryOpen, setIsTemplateGalleryOpen] = useState(false)
    const [isClassNameDialogOpen, setIsClassNameDialogOpen] = useState(false)
    const [pendingTemplate, setPendingTemplate] = useState<JavaTemplate | null>(null)

    // Assets state (for includesAssetPack)
    const [selectedAsset, setSelectedAsset] = useState<ServerAsset | null>(null)

    // Asset creation modals
    const [isAssetTemplateGalleryOpen, setIsAssetTemplateGalleryOpen] = useState(false)
    const [isAssetNameDialogOpen, setIsAssetNameDialogOpen] = useState(false)
    const [pendingAssetTemplate, setPendingAssetTemplate] = useState<{ id: ServerAssetTemplate; label: string; category: string } | null>(null)
    const [assetToRename, setAssetToRename] = useState<ServerAsset | null>(null)

    // Build output dialog state
    const [buildResult, setBuildResult] = useState<BuildPluginResult | null>(null)
    const [showBuildDialog, setShowBuildDialog] = useState(false)

    // Dirty files tracking
    const hasAnyDirtyFiles = useDirtyFilesStore((s) => s.hasAnyDirtyFiles)
    const clearAllDirtyFiles = useDirtyFilesStore((s) => s.clearAllDirtyFiles)
    const getDirtyFilePaths = useDirtyFilesStore((s) => s.getDirtyFilePaths)
    const [showUnsavedDialog, setShowUnsavedDialog] = useState(false)
    const [pendingNavigation, setPendingNavigation] = useState<(() => void) | null>(null)

    const isBuilding = buildPlugin.isPending

    // Java class creation handlers
    const handleTemplateSelect = (template: JavaTemplate) => {
        setIsTemplateGalleryOpen(false)
        setPendingTemplate(template)
        setIsClassNameDialogOpen(true)
    }

    const handleCreateClass = async (className: string, packagePath: string) => {
        if (!pendingTemplate) return

        const result = await createJavaClass.mutateAsync({
            projectPath: project.path,
            packagePath,
            className,
            template: pendingTemplate.id
        })

        if (result.result.success) {
            // Find and select the new file
            const newFile = sources.find(s => s.relativePath === result.result.relativePath)
                || { ...result.result, id: result.result.relativePath, name: `${className}.java`, className, packageName: packagePath ? `${basePackage}.${packagePath}` : basePackage, absolutePath: result.result.filePath }
            setSelectedFile(newFile as JavaSourceFile)
        }
        setPendingTemplate(null)
    }

    const handleDeleteFile = async (file: JavaSourceFile) => {
        if (!confirm(`Are you sure you want to delete ${file.name}?`)) return

        await deleteJavaFile.mutateAsync({
            projectPath: project.path,
            file
        })

        if (selectedFile?.id === file.id) {
            setSelectedFile(null)
        }
    }

    const handleSaveFile = async (content: string) => {
        if (!selectedFile) return
        await saveJavaFile.mutateAsync({
            filePath: selectedFile.absolutePath,
            content
        })
    }

    // Asset handlers (for includesAssetPack)
    const handleAssetTemplateSelect = (template: { id: ServerAssetTemplate; label: string; category: string }) => {
        setIsAssetTemplateGalleryOpen(false)
        setPendingAssetTemplate(template)
        setIsAssetNameDialogOpen(true)
    }

    const handleCreateAsset = async (name: string) => {
        if (!pendingAssetTemplate) return

        let subfolder = 'Items'
        if (pendingAssetTemplate.category === 'Blocks') subfolder = 'Blocks'
        if (pendingAssetTemplate.category === 'Entities') subfolder = 'Entity'
        if (pendingAssetTemplate.category === 'Audio') subfolder = 'Audio'

        const result = await createAsset.mutateAsync({
            projectPath: project.path,
            destination: `Server/${subfolder}`,
            name: name,
            template: pendingAssetTemplate.id
        })

        if (result.result.success) {
            setSelectedAsset(result.result.asset)
        }
        setPendingAssetTemplate(null)
    }

    const handleDeleteAsset = async (asset: ServerAsset) => {
        if (!confirm(`Are you sure you want to delete ${asset.name}?`)) return
        await deleteAsset.mutateAsync({ projectPath: project.path, asset })
        if (selectedAsset?.id === asset.id) {
            setSelectedAsset(null)
        }
    }

    const handleRenameAsset = (asset: ServerAsset) => {
        setAssetToRename(asset)
        setIsAssetNameDialogOpen(true)
    }

    const handleConfirmAssetRename = async (newName: string) => {
        if (!assetToRename) return
        if (newName === assetToRename.name.replace(/\.[^/.]+$/, "")) return

        await renameAsset.mutateAsync({
            projectPath: project.path,
            asset: assetToRename,
            newName,
        })
    }

    const handleBuild = async () => {
        const result = await buildPlugin.mutateAsync({ projectPath: project.path })
        setBuildResult(result)
        setShowBuildDialog(true)
    }

    const handleRevealBuildArtifact = (artifact: { outputPath: string; id: string }) => {
        revealArtifact.mutate(artifact.id)
    }

    const attemptNavigation = (navigationFn: () => void) => {
        if (hasAnyDirtyFiles()) {
            setPendingNavigation(() => navigationFn)
            setShowUnsavedDialog(true)
        } else {
            navigationFn()
        }
    }

    const handleBackClick = () => {
        if (mode === 'source' && selectedFile) {
            setSelectedFile(null)
        } else if (mode === 'assets' && selectedAsset) {
            setSelectedAsset(null)
        } else {
            attemptNavigation(() => {
                clearAllDirtyFiles()
                onBack()
            })
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

    return (
        <div className="flex flex-col h-[calc(100vh-6rem)] bg-background -mx-6 -my-6">
            {/* Top Navigation Header */}
            <header className="flex items-center justify-between px-6 py-4 bg-background z-20 border-b">
                <div className="flex items-center gap-6">
                    <div className="flex items-center gap-4">
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={handleBackClick}
                            className="h-9 w-9"
                        >
                            <ChevronLeft className="h-5 w-5" />
                        </Button>
                        <div>
                            <h1 className="text-lg font-bold tracking-tight">{project.name}</h1>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <Badge variant="outline" className="h-4 px-1.5 text-[9px] uppercase tracking-wider rounded-sm">
                                    Plugin
                                </Badge>
                                <span>v{project.version || '1.0.0'}</span>
                            </div>
                        </div>
                    </div>

                    {project.includesAssetPack && (
                        <>
                            <div className="h-8 w-px bg-border/50 mx-2" />

                            {/* Mode Toggle */}
                            <div className="flex items-center gap-1 p-1 rounded-lg bg-muted/50">
                                <button
                                    onClick={() => setMode('source')}
                                    className={cn(
                                        "flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
                                        mode === 'source'
                                            ? "bg-background shadow-sm text-foreground"
                                            : "text-muted-foreground hover:text-foreground"
                                    )}
                                >
                                    <Code className="h-4 w-4" />
                                    Source
                                </button>
                                <button
                                    onClick={() => setMode('assets')}
                                    className={cn(
                                        "flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
                                        mode === 'assets'
                                            ? "bg-background shadow-sm text-foreground"
                                            : "text-muted-foreground hover:text-foreground"
                                    )}
                                >
                                    <Package className="h-4 w-4" />
                                    Assets
                                </button>
                            </div>
                        </>
                    )}
                </div>

                <div className="flex items-center gap-3">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => window.hymn.openInEditor(project.path)}
                        className="gap-2"
                    >
                        <ExternalLink className="h-3.5 w-3.5" />
                        Open in Editor
                    </Button>
                    {canBuild ? (
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
                    ) : (
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <div>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="gap-2 font-semibold opacity-50"
                                        disabled
                                    >
                                        <AlertTriangle className="h-3.5 w-3.5" />
                                        Build
                                    </Button>
                                </div>
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>Java 17+ is required to build plugins.</p>
                                <p className="text-xs text-muted-foreground">Configure JDK path in the Create tab.</p>
                            </TooltipContent>
                        </Tooltip>
                    )}
                    <DependencyStatus />
                </div>
            </header>

            {/* Main Content Area */}
            <main className="flex-1 overflow-hidden relative bg-muted/5">
                {mode === 'source' ? (
                    <div className="flex h-full">
                        {/* Source Explorer Sidebar */}
                        <div className="w-64 flex-shrink-0">
                            <SourceExplorer
                                sources={sources}
                                basePackage={basePackage}
                                selectedFile={selectedFile}
                                onFileSelect={setSelectedFile}
                                onAddClass={() => setIsTemplateGalleryOpen(true)}
                                onDeleteFile={handleDeleteFile}
                                onRefresh={() => refetchSources()}
                                isLoading={isLoadingSources}
                            />
                        </div>

                        {/* Editor Area */}
                        <div className="flex-1 overflow-hidden">
                            <JavaFileEditor
                                file={selectedFile}
                                onSave={handleSaveFile}
                                onClose={() => setSelectedFile(null)}
                            />
                        </div>
                    </div>
                ) : (
                    /* Assets Mode */
                    isLoadingAssets ? (
                        <div className="flex-1 h-full flex flex-col items-center justify-center gap-4 text-muted-foreground">
                            <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                            <p className="text-xs font-bold uppercase tracking-widest text-primary">Loading Assets...</p>
                        </div>
                    ) : selectedAsset ? (
                        <AssetDetails
                            asset={selectedAsset}
                            onBack={() => setSelectedAsset(null)}
                        />
                    ) : (
                        <AssetGrid
                            category="all"
                            assets={assets}
                            onAssetSelect={setSelectedAsset}
                            onAddNew={() => setIsAssetTemplateGalleryOpen(true)}
                            onDelete={handleDeleteAsset}
                            onRename={handleRenameAsset}
                            onReveal={(asset) => window.hymn.openInExplorer(asset.absolutePath)}
                        />
                    )
                )}
            </main>

            {/* Java Class Creation Dialogs */}
            <JavaTemplateGallery
                isOpen={isTemplateGalleryOpen}
                onClose={() => setIsTemplateGalleryOpen(false)}
                onSelect={handleTemplateSelect}
            />

            <JavaClassNameDialog
                isOpen={isClassNameDialogOpen}
                onClose={() => {
                    setIsClassNameDialogOpen(false)
                    setPendingTemplate(null)
                }}
                onConfirm={handleCreateClass}
                templateLabel={pendingTemplate?.label || 'Class'}
                suggestedPackage={pendingTemplate?.suggestedPackage || ''}
                basePackage={basePackage}
            />

            {/* Asset Creation Dialogs (for includesAssetPack) */}
            <TemplateGallery
                isOpen={isAssetTemplateGalleryOpen}
                onClose={() => setIsAssetTemplateGalleryOpen(false)}
                onSelect={handleAssetTemplateSelect}
                category="all"
            />

            <AssetNameDialog
                isOpen={isAssetNameDialogOpen}
                onClose={() => {
                    setIsAssetNameDialogOpen(false)
                    setAssetToRename(null)
                    setPendingAssetTemplate(null)
                }}
                onConfirm={(name) => {
                    if (assetToRename) {
                        handleConfirmAssetRename(name)
                    } else {
                        handleCreateAsset(name)
                    }
                }}
                templateLabel={assetToRename ? 'Asset' : (pendingAssetTemplate?.label || 'Asset')}
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
                type="plugin"
                onRevealArtifact={buildResult?.artifact ? handleRevealBuildArtifact : undefined}
            />
        </div>
    )
}
