import { useState, useEffect, useCallback } from 'react'
import type { ProjectEntry, JavaSourceFile, ServerAsset } from '@/shared/hymn-types'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
    ChevronLeft,
    Play,
    Code,
    Package,
    FolderOpen,
    Download,
    Trash2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

// Components
import { SourceExplorer } from './SourceExplorer'
import { JavaFileEditor } from './JavaFileEditor'
import { JavaTemplateGallery, JavaTemplate } from './JavaTemplateGallery'
import { JavaClassNameDialog } from './JavaClassNameDialog'
import { AssetGrid } from './AssetGrid'
import { AssetDetails } from './AssetDetails'
import { TemplateGallery } from './TemplateGallery'
import { AssetNameDialog } from './AssetNameDialog'

interface PluginWorkspaceProps {
    project: ProjectEntry
    onBack: () => void
    onInstallChange?: () => void
}

type WorkspaceMode = 'source' | 'assets'

export function PluginWorkspace({ project, onBack, onInstallChange }: PluginWorkspaceProps) {
    // Mode: source code vs assets (for plugins with includesAssetPack)
    const [mode, setMode] = useState<WorkspaceMode>('source')

    // Source code state
    const [sources, setSources] = useState<JavaSourceFile[]>([])
    const [basePackage, setBasePackage] = useState('')
    const [selectedFile, setSelectedFile] = useState<JavaSourceFile | null>(null)
    const [isLoadingSources, setIsLoadingSources] = useState(true)

    // Java class creation modals
    const [isTemplateGalleryOpen, setIsTemplateGalleryOpen] = useState(false)
    const [isClassNameDialogOpen, setIsClassNameDialogOpen] = useState(false)
    const [pendingTemplate, setPendingTemplate] = useState<JavaTemplate | null>(null)

    // Assets state (for includesAssetPack)
    const [assets, setAssets] = useState<ServerAsset[]>([])
    const [selectedAsset, setSelectedAsset] = useState<ServerAsset | null>(null)
    const [isLoadingAssets, setIsLoadingAssets] = useState(false)

    // Asset creation modals
    const [isAssetTemplateGalleryOpen, setIsAssetTemplateGalleryOpen] = useState(false)
    const [isAssetNameDialogOpen, setIsAssetNameDialogOpen] = useState(false)
    const [pendingAssetTemplate, setPendingAssetTemplate] = useState<any>(null)
    const [assetToRename, setAssetToRename] = useState<ServerAsset | null>(null)

    // Building state
    const [isBuilding, setIsBuilding] = useState(false)

    // Install state
    const [isInstalled, setIsInstalled] = useState(project.isInstalled)
    const [isInstalling, setIsInstalling] = useState(false)

    const loadSources = useCallback(async () => {
        setIsLoadingSources(true)
        try {
            const result = await window.hymn.listJavaSources({ projectPath: project.path })
            setSources(result.sources)
            setBasePackage(result.basePackage)
        } catch (error) {
            console.error('Failed to load sources:', error)
            toast.error('Failed to load source files')
        } finally {
            setIsLoadingSources(false)
        }
    }, [project.path])

    const loadAssets = useCallback(async () => {
        setIsLoadingAssets(true)
        try {
            const result = await window.hymn.listServerAssets({ path: project.path })
            setAssets(result.assets)
        } catch (error) {
            console.error('Failed to load assets:', error)
            toast.error('Failed to load assets')
        } finally {
            setIsLoadingAssets(false)
        }
    }, [project.path])

    useEffect(() => {
        loadSources()
        if (project.includesAssetPack) {
            loadAssets()
        }
    }, [loadSources, loadAssets, project.includesAssetPack])

    // Java class creation handlers
    const handleTemplateSelect = (template: JavaTemplate) => {
        setIsTemplateGalleryOpen(false)
        setPendingTemplate(template)
        setIsClassNameDialogOpen(true)
    }

    const handleCreateClass = async (className: string, packagePath: string) => {
        if (!pendingTemplate) return

        try {
            const result = await window.hymn.createJavaClass({
                projectPath: project.path,
                packagePath,
                className,
                template: pendingTemplate.id
            })

            if (result.success) {
                toast.success(`${className}.java created!`)
                await loadSources()
                // Find and select the new file
                const newFile = sources.find(s => s.relativePath === result.relativePath)
                    || { ...result, id: result.relativePath, name: `${className}.java`, className, packageName: packagePath ? `${basePackage}.${packagePath}` : basePackage, absolutePath: result.filePath }
                setSelectedFile(newFile as JavaSourceFile)
            }
        } catch (err) {
            console.error('Failed to create class:', err)
            toast.error('Failed to create class')
        } finally {
            setPendingTemplate(null)
        }
    }

    const handleDeleteFile = async (file: JavaSourceFile) => {
        if (!confirm(`Are you sure you want to delete ${file.name}?`)) return

        try {
            await window.hymn.deleteJavaClass({
                projectPath: project.path,
                relativePath: file.relativePath
            })
            toast.success('File deleted')
            if (selectedFile?.id === file.id) {
                setSelectedFile(null)
            }
            await loadSources()
        } catch (error) {
            console.error('Failed to delete file:', error)
            toast.error('Failed to delete file')
        }
    }

    const handleSaveFile = async (content: string) => {
        if (!selectedFile) return
        await window.hymn.saveFile(selectedFile.absolutePath, content)
        toast.success('File saved')
    }

    // Asset handlers (for includesAssetPack)
    const handleAssetTemplateSelect = (template: any) => {
        setIsAssetTemplateGalleryOpen(false)
        setPendingAssetTemplate(template)
        setIsAssetNameDialogOpen(true)
    }

    const handleCreateAsset = async (name: string) => {
        if (!pendingAssetTemplate) return

        try {
            let subfolder = 'Items'
            if (pendingAssetTemplate.category === 'Blocks') subfolder = 'Blocks'
            if (pendingAssetTemplate.category === 'Entities') subfolder = 'Entity'
            if (pendingAssetTemplate.category === 'Audio') subfolder = 'Audio'

            const result = await window.hymn.createServerAsset({
                path: project.path,
                destination: `Server/${subfolder}`,
                name: name,
                template: pendingAssetTemplate.id
            })

            if (result.success) {
                toast.success(`${pendingAssetTemplate.label} created!`)
                await loadAssets()
                setSelectedAsset(result.asset)
            }
        } catch (err) {
            console.error('Failed to create asset:', err)
            toast.error('Failed to create asset')
        } finally {
            setPendingAssetTemplate(null)
        }
    }

    const handleDeleteAsset = async (asset: ServerAsset) => {
        if (!confirm(`Are you sure you want to delete ${asset.name}?`)) return
        try {
            await window.hymn.deleteServerAsset({ path: project.path, relativePath: asset.relativePath })
            toast.success('Asset deleted')
            if (selectedAsset?.id === asset.id) {
                setSelectedAsset(null)
            }
            await loadAssets()
        } catch (error) {
            toast.error('Failed to delete asset')
        }
    }

    const handleRenameAsset = (asset: ServerAsset) => {
        setAssetToRename(asset)
        setIsAssetNameDialogOpen(true)
    }

    const handleConfirmAssetRename = async (newName: string) => {
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
                destination: newPath
            })
            toast.success('Asset renamed')
            await loadAssets()
        } catch (error) {
            toast.error('Failed to rename asset')
        }
    }

    const handleInstall = async () => {
        setIsInstalling(true)
        try {
            await window.hymn.installProject({
                projectPath: project.path,
                projectType: 'plugin',
            })
            setIsInstalled(true)
            toast.success('Plugin installed for testing')
            onInstallChange?.()
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Failed to install plugin')
        } finally {
            setIsInstalling(false)
        }
    }

    const handleUninstall = async () => {
        if (!project.installedPath) return
        setIsInstalling(true)
        try {
            await window.hymn.uninstallProject({
                projectPath: project.installedPath,
            })
            setIsInstalled(false)
            toast.success('Plugin uninstalled')
            onInstallChange?.()
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Failed to uninstall plugin')
        } finally {
            setIsInstalling(false)
        }
    }

    const handleBuild = async () => {
        setIsBuilding(true)
        toast.info('Building plugin...')
        try {
            const result = await window.hymn.buildMod({ path: project.path })
            if (result.success) {
                toast.success('Build complete!')
            } else {
                toast.error('Build failed. Check output for errors.')
            }
        } catch (err) {
            toast.error('Build failed')
        } finally {
            setIsBuilding(false)
        }
    }

    const handleBackClick = () => {
        if (mode === 'source' && selectedFile) {
            setSelectedFile(null)
        } else if (mode === 'assets' && selectedAsset) {
            setSelectedAsset(null)
        } else {
            onBack()
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
                        onClick={() => window.hymn.openInExplorer(project.path)}
                        className="gap-2"
                    >
                        <FolderOpen className="h-3.5 w-3.5" />
                        Open Folder
                    </Button>
                    {/* Install/Uninstall Toggle */}
                    {isInstalled ? (
                        <Button
                            variant="outline"
                            size="sm"
                            className="gap-2 text-destructive hover:text-destructive"
                            onClick={handleUninstall}
                            disabled={isInstalling}
                        >
                            <Trash2 className="h-3.5 w-3.5" />
                            {isInstalling ? 'Uninstalling...' : 'Uninstall'}
                        </Button>
                    ) : (
                        <Button
                            variant="outline"
                            size="sm"
                            className="gap-2"
                            onClick={handleInstall}
                            disabled={isInstalling}
                        >
                            <Download className="h-3.5 w-3.5" />
                            {isInstalling ? 'Installing...' : 'Install for Testing'}
                        </Button>
                    )}
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
                                onRefresh={loadSources}
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
        </div>
    )
}
