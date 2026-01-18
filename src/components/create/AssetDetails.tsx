import { useState, useEffect } from 'react'
import { ServerAsset } from '@/shared/hymn-types'
import { Button } from '@/components/ui/button'
import {
    Save,
    Code as CodeIcon,
    Layers,
    Sparkles,
    Shield,
    Zap,
    AlignLeft,
    AlertCircle,
    Check,
    FileX,
    Loader2
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { Separator } from '@/components/ui/separator'
import Editor, { OnMount } from "@monaco-editor/react"
import type { editor } from 'monaco-editor'
import { cn } from '@/lib/utils'
import { useMonacoTheme } from '@/hooks/useMonacoTheme'
import { useDirtyFilesStore } from '@/stores'

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
        } catch (err) {
            toast.error('Failed to save asset')
        }
    }

    const updateField = (path: string, value: unknown) => {
        if (!data) return
        const keys = path.split('.')
        const newData = { ...data } as AssetData
        let current = newData as AssetData
        for (let i = 0; i < keys.length - 1; i++) {
            if (!current[keys[i]]) current[keys[i]] = {}
            current = current[keys[i]] as AssetData
        }
        current[keys[keys.length - 1]] = value
        setData(newData)
    }

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
        } catch (e) {
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
                    <div className="h-full overflow-y-auto custom-scrollbar p-6">
                        <div className="max-w-5xl mx-auto space-y-6 pb-12">
                            {/* Universal Basics */}
                            <ComponentCard title="Translation" icon={Sparkles} description="User-facing names">
                                <div className="space-y-1">
                                    <Label>Display Name</Label>
                                    <Input
                                        value={data?.TranslationProperties?.Name || ''}
                                        onChange={(e) => updateField('TranslationProperties.Name', e.target.value)}
                                        placeholder="In-game Name"
                                    />
                                </div>
                            </ComponentCard>

                            {/* Type Specific Editors */}
                            {asset.kind === 'item' && <ItemEditor data={data} updateField={updateField} modRoot={modRoot} />}
                            {asset.kind === 'block' && <BlockEditor data={data} updateField={updateField} />}
                            {asset.kind === 'entity' && <EntityEditor data={data} updateField={updateField} modRoot={modRoot} />}

                            {/* Fallback for others */}
                            {!['item', 'block', 'entity'].includes(asset.kind) && (
                                <div className="p-8 text-center border-2 border-dashed rounded-xl opacity-50">
                                    <p className="text-sm text-muted-foreground">Generic Editor Not Available for {asset.kind}</p>
                                    <Button variant="link" onClick={() => setMode('code')} className="mt-2">Switch to Code View</Button>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}

// --- Sub-Editors ---

function ItemEditor({ data, updateField, modRoot }: { data: AssetData | null, updateField: (p: string, v: unknown) => void, modRoot: string | null }) {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <ComponentCard title="Visuals" icon={Layers} description="Item appearance">
                <div className="space-y-4">
                    <div className="space-y-1">
                        <Label>Icon Path</Label>
                        <PathInput
                            value={data?.Icon || ''}
                            onChange={e => updateField('Icon', e)}
                            modRoot={modRoot}
                            placeholder="textures/icons/..."
                        />
                    </div>
                    <div className="space-y-1">
                        <Label>Model Path</Label>
                        <PathInput
                            value={data?.Model || ''}
                            onChange={e => updateField('Model', e)}
                            modRoot={modRoot}
                            placeholder="models/items/..."
                        />
                    </div>
                </div>
            </ComponentCard>

            <ComponentCard title="Properties" icon={Zap} description="Stacking & Usage">
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                        <Label>Max Stack</Label>
                        <Input type="number" value={data?.MaxStack || 64} onChange={e => updateField('MaxStack', parseInt(e.target.value))} />
                    </div>
                    <div className="space-y-1">
                        <Label>Durability</Label>
                        <Input type="number" value={data?.Durability || 0} onChange={e => updateField('Durability', parseInt(e.target.value))} />
                    </div>
                </div>
            </ComponentCard>

            {(data?.Attacks) && (
                <ComponentCard title="Combat" icon={Shield} description="Attack statistics">
                    <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-1">
                            <Label>Damage</Label>
                            <Input type="number" value={data?.Attacks?.[0]?.Damage || 0} onChange={e => updateField('Attacks.0.Damage', parseInt(e.target.value))} />
                        </div>
                        <div className="space-y-1">
                            <Label>Reach</Label>
                            <Input type="number" value={data?.Attacks?.[0]?.Reach || 0} onChange={e => updateField('Attacks.0.Reach', parseFloat(e.target.value))} />
                        </div>
                        <div className="space-y-1">
                            <Label>Cooldown</Label>
                            <Input type="number" value={data?.Attacks?.[0]?.Time || 0} onChange={e => updateField('Attacks.0.Time', parseFloat(e.target.value))} />
                        </div>
                    </div>
                </ComponentCard>
            )}
        </div>
    )
}

function BlockEditor({ data, updateField }: { data: AssetData | null, updateField: (p: string, v: unknown) => void }) {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <ComponentCard title="Block Identity" icon={Layers} description="Type definition">
                <div className="space-y-1">
                    <Label>Block Type ID</Label>
                    <Input value={data?.BlockType || ''} onChange={e => updateField('BlockType', e.target.value)} />
                </div>
            </ComponentCard>

            <ComponentCard title="Physical Properties" icon={Shield} description="Hardness & Resistance">
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                        <Label>Hardness</Label>
                        <Input type="number" value={data?.ExampleState?.Hardness || 0} onChange={e => updateField('ExampleState.Hardness', parseFloat(e.target.value))} />
                    </div>
                    <div className="space-y-1">
                        <Label>Resistance</Label>
                        <Input type="number" value={data?.ExampleState?.Resistance || 0} onChange={e => updateField('ExampleState.Resistance', parseFloat(e.target.value))} />
                    </div>
                </div>
            </ComponentCard>

            <ComponentCard title="State" icon={Zap} description="Rendering & Collision">
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                        <Label>Render Type</Label>
                        <select
                            className="w-full bg-muted/30 border rounded-lg px-2 py-2 text-xs"
                            value={data?.ExampleState?.RenderType || 'Solid'}
                            onChange={e => updateField('ExampleState.RenderType', e.target.value)}
                        >
                            <option value="Solid">Solid</option>
                            <option value="Cutout">Cutout</option>
                            <option value="Translucent">Translucent</option>
                            <option value="Fluid">Fluid</option>
                            <option value="Invisible">Invisible</option>
                        </select>
                    </div>
                    <div className="flex items-center gap-2 pt-6">
                        <input
                            type="checkbox"
                            checked={data?.ExampleState?.Collidable ?? true}
                            onChange={e => updateField('ExampleState.Collidable', e.target.checked)}
                        />
                        <Label>Collidable</Label>
                    </div>
                </div>
            </ComponentCard>
        </div>
    )
}

function EntityEditor({ data, updateField, modRoot }: { data: AssetData | null, updateField: (p: string, v: unknown) => void, modRoot: string | null }) {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <ComponentCard title="Character" icon={Layers} description="Appearance">
                <div className="space-y-4">
                    <div className="space-y-1">
                        <Label>Prefab ID</Label>
                        <Input value={data?.Prefab || ''} onChange={e => updateField('Prefab', e.target.value)} />
                    </div>
                    <div className="space-y-1">
                        <Label>Model Path</Label>
                        <PathInput value={data?.Character?.Model || ''} onChange={e => updateField('Character.Model', e)} modRoot={modRoot} />
                    </div>
                    <div className="space-y-1">
                        <Label>Scale</Label>
                        <Input type="number" step="0.1" value={data?.Character?.Scale || 1.0} onChange={e => updateField('Character.Scale', parseFloat(e.target.value))} />
                    </div>
                </div>
            </ComponentCard>

            <ComponentCard title="AI & Faction" icon={Zap} description="Behavioral settings">
                <div className="space-y-4">
                    <div className="space-y-1">
                        <Label>Faction</Label>
                        <select
                            className="w-full bg-muted/30 border rounded-lg px-2 py-2 text-xs"
                            value={data?.Faction || 'Neutral'}
                            onChange={e => updateField('Faction', e.target.value)}
                        >
                            <option value="Neutral">Neutral</option>
                            <option value="Friendly">Friendly</option>
                            <option value="Hostile">Hostile</option>
                            <option value="Passive">Passive</option>
                        </select>
                    </div>
                </div>
            </ComponentCard>
        </div>
    )
}

function Label({ children }: { children: React.ReactNode }) {
    return <label className="text-[10px] font-bold uppercase text-muted-foreground block mb-1">{children}</label>
}

// Path Input Component with validation feedback
function PathInput(props: { value: string, onChange: (val: string) => void, modRoot: string | null, placeholder?: string }) {
    const [isValid, setIsValid] = useState<boolean | null>(null)
    const [isChecking, setIsChecking] = useState(false)
    const [checkedPath, setCheckedPath] = useState<string | null>(null)
    const [showError, setShowError] = useState(false)

    useEffect(() => {
        // Hide error immediately when value changes
        setShowError(false)

        const checkPath = async () => {
            // No value or mod root - reset state
            if (!props.value || !props.modRoot) {
                setIsValid(null)
                setCheckedPath(null)
                return
            }

            setIsChecking(true)
            try {
                // Normalize path separators consistently
                const normalizedRoot = props.modRoot.replace(/\\/g, '/')
                const normalizedValue = props.value.replace(/\\/g, '/')
                const sep = '/'
                const fullPath = normalizedRoot + (normalizedRoot.endsWith(sep) ? '' : sep) + normalizedValue

                setCheckedPath(fullPath)
                const exists = await window.hymn.checkPathExists(fullPath)
                setIsValid(exists)

                // Show error with a slight delay for smoother UX
                if (!exists) {
                    setTimeout(() => setShowError(true), 50)
                }
            } catch (err) {
                setIsValid(false)
                setCheckedPath(null)
                setTimeout(() => setShowError(true), 50)
            } finally {
                setIsChecking(false)
            }
        }

        const timeout = setTimeout(checkPath, 400)
        return () => clearTimeout(timeout)
    }, [props.value, props.modRoot])

    return (
        <div className="relative group">
            <input
                className={cn(
                    "w-full bg-muted/30 border rounded-lg pl-3 pr-10 py-2 text-sm font-mono",
                    "focus:outline-none focus:ring-2 focus:bg-background transition-all duration-200",
                    isValid === null && "focus:ring-primary/50",
                    isValid === false && "border-destructive/60 focus:ring-destructive/50 bg-destructive/5",
                    isValid === true && "border-emerald-500/40 focus:ring-emerald-500/50 bg-emerald-500/5"
                )}
                value={props.value}
                onChange={(e) => props.onChange(e.target.value)}
                placeholder={props.placeholder}
            />

            {/* Status indicator */}
            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                {isChecking && (
                    <Loader2 className="h-4 w-4 text-muted-foreground animate-spin" />
                )}
                {!isChecking && isValid === true && (
                    <div className="p-0.5 rounded-full bg-emerald-500/20">
                        <Check className="h-3 w-3 text-emerald-500" />
                    </div>
                )}
                {!isChecking && isValid === false && (
                    <div className="p-0.5 rounded-full bg-destructive/20">
                        <AlertCircle className="h-3 w-3 text-destructive" />
                    </div>
                )}
            </div>

            {/* File not found error panel */}
            {!isChecking && isValid === false && showError && (
                <div
                    className={cn(
                        "absolute top-full left-0 right-0 mt-2 z-20",
                        "animate-in fade-in-0 slide-in-from-top-1 duration-200"
                    )}
                >
                    <div className="bg-card border border-destructive/30 rounded-lg shadow-lg overflow-hidden">
                        {/* Header */}
                        <div className="flex items-center gap-2 px-3 py-2 bg-destructive/10 border-b border-destructive/20">
                            <FileX className="h-4 w-4 text-destructive shrink-0" />
                            <span className="text-xs font-semibold text-destructive">File Not Found</span>
                        </div>

                        {/* Content */}
                        <div className="px-3 py-2 space-y-1.5">
                            <p className="text-[11px] text-muted-foreground">
                                The specified file does not exist at the expected location.
                            </p>

                            {checkedPath && (
                                <div className="mt-2">
                                    <span className="text-[10px] font-medium text-muted-foreground/70 uppercase tracking-wider">
                                        Expected Path
                                    </span>
                                    <div className="mt-1 px-2 py-1.5 bg-muted/50 rounded text-[10px] font-mono text-muted-foreground break-all">
                                        {checkedPath}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
    return <input className="w-full bg-muted/30 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary focus:bg-background transition-colors" {...props} />
}

interface ComponentCardProps {
    title: string
    icon: React.ComponentType<{ className?: string }>
    description: string
    children: React.ReactNode
}

function ComponentCard({ title, icon: Icon, description, children }: ComponentCardProps) {
    return (
        <div className="bg-card/40 rounded-2xl overflow-hidden">
            <div className="p-4 bg-muted/20 border-b flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10">
                        <Icon className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                        <h3 className="text-sm font-bold uppercase tracking-tight">{title}</h3>
                        <p className="text-[10px] text-muted-foreground">{description}</p>
                    </div>
                </div>
            </div>
            <div className="p-6">
                {children}
            </div>
        </div>
    )
}
