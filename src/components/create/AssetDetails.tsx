import { useState, useEffect, useCallback } from 'react'
import { ServerAsset } from '@/shared/hymn-types'
import { Button } from '@/components/ui/button'
import {
    Save,
    Code as CodeIcon,
    AlignLeft,
    ExternalLink,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { Separator } from '@/components/ui/separator'
import Editor, { OnMount } from "@monaco-editor/react"
import type { editor } from 'monaco-editor'
import { cn } from '@/lib/utils'
import { useMonacoTheme } from '@/hooks/useMonacoTheme'
import { useDirtyFilesStore } from '@/stores'
import { PropertiesPanel } from './properties'

interface AssetDetailsProps {
    asset: ServerAsset
    onBack?: () => void
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AssetData = Record<string, any>

export function AssetDetails({ asset }: AssetDetailsProps) {
    const [data, setData] = useState<AssetData | null>(null)
    const [originalData, setOriginalData] = useState<AssetData | null>(null)
    const [mode, setMode] = useState<'visual' | 'code'>('visual')
    const [isLoading, setIsLoading] = useState(true)
    const [modRoot, setModRoot] = useState<string | null>(null)

    // Editor State
    const [editorRef, setEditorRef] = useState<editor.IStandaloneCodeEditor | null>(null)
    const { theme: monacoTheme } = useMonacoTheme()
    const setDirtyFile = useDirtyFilesStore((s) => s.setDirtyFile)
    const clearDirtyFile = useDirtyFilesStore((s) => s.clearDirtyFile)
    const getDirtyContent = useDirtyFilesStore((s) => s.getDirtyContent)

    const isDirty = data !== null && originalData !== null &&
        JSON.stringify(data) !== JSON.stringify(originalData)

    useEffect(() => {
        const loadData = async () => {
            setIsLoading(true)
            try {
                // Infer Mod Root from asset path
                const normAbs = asset.absolutePath.replace(/\\/g, '/')
                const normRel = asset.relativePath.replace(/\\/g, '/')
                if (normAbs.endsWith(normRel)) {
                    setModRoot(normAbs.slice(0, -normRel.length))
                }

                // Check for dirty content first
                const dirtyContent = getDirtyContent(asset.absolutePath)

                const content = await window.hymn.readFile(asset.absolutePath)
                const originalParsed = JSON.parse(content)
                setOriginalData(originalParsed)

                // Use dirty content if available
                if (dirtyContent !== undefined) {
                    try {
                        setData(JSON.parse(dirtyContent))
                    } catch {
                        setData(originalParsed)
                    }
                } else {
                    setData(originalParsed)
                }
            } catch (error) {
                console.error('Failed to load asset data:', error)
            } finally {
                setIsLoading(false)
            }
        }
        loadData()
    }, [asset.absolutePath, asset.relativePath, getDirtyContent])

    // Update dirty files context when data changes
    useEffect(() => {
        if (data && originalData) {
            const currentContent = JSON.stringify(data, null, 2)
            const originalContent = JSON.stringify(originalData, null, 2)
            setDirtyFile(asset.absolutePath, currentContent, originalContent)
        }
    }, [data, originalData, asset.absolutePath, setDirtyFile])

    const handleSave = async () => {
        try {
            await window.hymn.saveFile(asset.absolutePath, JSON.stringify(data, null, 2))
            setOriginalData(data)
            clearDirtyFile(asset.absolutePath)
            toast.success(`${asset.kind} saved successfully`)
        } catch {
            toast.error('Failed to save asset')
        }
    }

    const updateField = useCallback((path: string, value: unknown) => {
        if (!data) return
        const keys = path.split('.')
        const newData = structuredClone(data) as AssetData
        let current = newData as AssetData
        for (let i = 0; i < keys.length - 1; i++) {
            if (!current[keys[i]]) current[keys[i]] = {}
            current = current[keys[i]] as AssetData
        }
        current[keys[keys.length - 1]] = value
        setData(newData)
    }, [data])

    const handleEditorDidMount: OnMount = (editorInstance, monaco) => {
        setEditorRef(editorInstance)
        monaco.languages.json.jsonDefaults.setDiagnosticsOptions({
            validate: true,
            schemas: []
        });
    }

    const handleFormat = () => {
        if (editorRef) {
            editorRef.getAction('editor.action.formatDocument')?.run()
            toast.success('Document formatted')
        }
    }

    const handleEditorChange = (value: string | undefined) => {
        if (!value) return
        try {
            const parsed = JSON.parse(value)
            setData(parsed)
        } catch {
            // Allow invalid JSON while typing
        }
    }

    if (isLoading) return <div className="p-12 text-center text-muted-foreground">Loading components...</div>

    return (
        <div className="flex flex-col h-full overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between mb-4 px-1 shrink-0">
                <div className="flex items-center gap-4">
                    <div>
                        <div className="flex items-center gap-2">
                            <h2 className="text-2xl font-bold tracking-tight">{asset.displayName || asset.name}</h2>
                            <Badge variant="outline" className="text-[10px] uppercase">{asset.kind}</Badge>
                            {isDirty && (
                                <span className="w-2 h-2 rounded-full bg-amber-500" title="Unsaved changes" />
                            )}
                        </div>
                        <p className="text-xs text-muted-foreground font-mono opacity-50">{asset.relativePath}</p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => window.hymn.openInEditor(asset.absolutePath)}
                        className="gap-2"
                    >
                        <ExternalLink className="h-3.5 w-3.5" />
                        Open in Editor
                    </Button>
                    {mode === 'code' && (
                        <Button variant="ghost" size="sm" onClick={handleFormat} className="gap-2">
                            <AlignLeft className="h-4 w-4" />
                            Format
                        </Button>
                    )}
                    <Button variant="ghost" size="sm" onClick={() => setMode(mode === 'visual' ? 'code' : 'visual')} className="gap-2">
                        <CodeIcon className="h-4 w-4" />
                        {mode === 'visual' ? 'View Source' : 'View Components'}
                    </Button>
                    <Separator orientation="vertical" className="h-6 mx-2" />
                    {isDirty && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                                setData(originalData)
                                clearDirtyFile(asset.absolutePath)
                            }}
                            className="text-muted-foreground"
                        >
                            Discard
                        </Button>
                    )}
                    <Button
                        onClick={handleSave}
                        disabled={!isDirty}
                        className={cn(
                            "h-10 gap-2 px-6 font-bold",
                            isDirty && "glow-primary"
                        )}
                    >
                        <Save className="h-4 w-4" />
                        Save Changes
                    </Button>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 min-h-0 overflow-hidden rounded-xl bg-background/50 relative">
                {mode === 'code' ? (
                    <Editor
                        height="100%"
                        defaultLanguage="json"
                        value={JSON.stringify(data, null, 2)}
                        onChange={handleEditorChange}
                        onMount={handleEditorDidMount}
                        theme={monacoTheme}
                        options={{
                            minimap: { enabled: false },
                            fontSize: 13,
                            scrollBeyondLastLine: false,
                            wordWrap: 'on',
                            padding: { top: 16, bottom: 16 },
                            formatOnType: true,
                            formatOnPaste: true,
                            automaticLayout: true,
                        }}
                    />
                ) : (
                    <PropertiesPanel
                        data={data || {}}
                        onChange={updateField}
                        modRoot={modRoot}
                        assetKind={asset.kind}
                    />
                )}
            </div>
        </div>
    )
}
