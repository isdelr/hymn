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
    Loader2,
    ExternalLink,
    FolderOpen,
    Hammer,
    Apple,
    FlaskConical,
    Rocket,
    Dice5,
    Store,
    Grid3X3,
    Sprout,
    Archive,
    Bird,
    Crown,
    Plus,
    Trash2
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
        } catch {
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
                    <div className="h-full overflow-y-auto custom-scrollbar p-6">
                        <div className="max-w-5xl mx-auto space-y-6 pb-12">
                            {/* Universal Basics */}
                            {data?.Parent !== undefined && (
                                <ComponentCard title="Inheritance" icon={Layers} description="Parent asset reference">
                                    <div className="space-y-1">
                                        <Label>Parent Asset ID</Label>
                                        <Input
                                            value={data?.Parent || ''}
                                            onChange={(e) => updateField('Parent', e.target.value || null)}
                                            placeholder="Optional parent asset to inherit from"
                                        />
                                        <p className="text-[10px] text-muted-foreground mt-1">Properties from the parent asset will be inherited unless overridden.</p>
                                    </div>
                                </ComponentCard>
                            )}

                            <ComponentCard title="Translation" icon={Sparkles} description="User-facing names">
                                <div className="space-y-4">
                                    <div className="space-y-1">
                                        <Label>Display Name</Label>
                                        <Input
                                            value={data?.TranslationProperties?.Name || ''}
                                            onChange={(e) => updateField('TranslationProperties.Name', e.target.value)}
                                            placeholder="In-game Name"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <Label>Description</Label>
                                        <Input
                                            value={data?.TranslationProperties?.Description || ''}
                                            onChange={(e) => updateField('TranslationProperties.Description', e.target.value)}
                                            placeholder="Item description (optional)"
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1">
                                            <Label>Name Key (Localization)</Label>
                                            <Input
                                                value={data?.NameKey || ''}
                                                onChange={(e) => updateField('NameKey', e.target.value || undefined)}
                                                placeholder="e.g., items.my_sword.name"
                                                className="font-mono text-xs"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <Label>Description Key</Label>
                                            <Input
                                                value={data?.DescriptionKey || ''}
                                                onChange={(e) => updateField('DescriptionKey', e.target.value || undefined)}
                                                placeholder="e.g., items.my_sword.desc"
                                                className="font-mono text-xs"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </ComponentCard>

                            {/* Type Specific Editors */}
                            {asset.kind === 'item' && <ItemEditor data={data} updateField={updateField} modRoot={modRoot} />}
                            {asset.kind === 'block' && <BlockEditor data={data} updateField={updateField} />}
                            {asset.kind === 'entity' && <EntityEditor data={data} updateField={updateField} modRoot={modRoot} />}
                            {asset.kind === 'projectile' && <ProjectileDataEditor data={data} updateField={updateField} modRoot={modRoot} />}
                            {asset.kind === 'drop' && <DropEditor data={data} updateField={updateField} setData={setData} />}
                            {asset.kind === 'recipe' && <RecipeEditor data={data} updateField={updateField} />}
                            {asset.kind === 'barter' && <BarterEditor data={data} setData={setData} />}

                            {/* Fallback for others */}
                            {!['item', 'block', 'entity', 'projectile', 'drop', 'recipe', 'barter'].includes(asset.kind) && (
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
                            placeholder="Icons/ItemsGenerated/..."
                            suggestedFolder="Common/Icons/ItemsGenerated"
                            pathPrefix="Common"
                            filters={[
                                { name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'tga', 'dds'] },
                                { name: 'All Files', extensions: ['*'] },
                            ]}
                            title="Select Icon"
                        />
                    </div>
                    <div className="space-y-1">
                        <Label>Model Path</Label>
                        <PathInput
                            value={data?.Model || ''}
                            onChange={e => updateField('Model', e)}
                            modRoot={modRoot}
                            placeholder="Items/MyItem.blockymodel"
                            suggestedFolder="Common/Items"
                            pathPrefix="Common"
                            filters={[
                                { name: 'Blocky Models', extensions: ['blockymodel'] },
                                { name: 'All Files', extensions: ['*'] },
                            ]}
                            title="Select Model"
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

            {/* Combat/Attack editor */}
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

            {/* Tool/Gathering editor */}
            {(data?.GatheringAttributes) && (
                <ComponentCard title="Tool Properties" icon={Hammer} description="Gathering attributes">
                    <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-1">
                            <Label>Tool Type</Label>
                            <select
                                className="w-full bg-muted/30 border rounded-lg px-2 py-2 text-xs"
                                value={data?.GatheringAttributes?.Type || 'Pickaxe'}
                                onChange={e => updateField('GatheringAttributes.Type', e.target.value)}
                            >
                                <option value="Pickaxe">Pickaxe</option>
                                <option value="Axe">Axe</option>
                                <option value="Shovel">Shovel</option>
                                <option value="Hoe">Hoe</option>
                            </select>
                        </div>
                        <div className="space-y-1">
                            <Label>Level</Label>
                            <Input type="number" value={data?.GatheringAttributes?.Level || 1} onChange={e => updateField('GatheringAttributes.Level', parseInt(e.target.value))} />
                        </div>
                        <div className="space-y-1">
                            <Label>Efficiency</Label>
                            <Input type="number" step="0.1" value={data?.GatheringAttributes?.Efficiency || 5.0} onChange={e => updateField('GatheringAttributes.Efficiency', parseFloat(e.target.value))} />
                        </div>
                    </div>
                </ComponentCard>
            )}

            {/* Armor editor */}
            {(data?.ArmorProperties) && (
                <ComponentCard title="Armor Properties" icon={Shield} description="Protection stats">
                    <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-1">
                            <Label>Slot</Label>
                            <select
                                className="w-full bg-muted/30 border rounded-lg px-2 py-2 text-xs"
                                value={data?.ArmorProperties?.Slot || 'Chest'}
                                onChange={e => updateField('ArmorProperties.Slot', e.target.value)}
                            >
                                <option value="Head">Head</option>
                                <option value="Chest">Chest</option>
                                <option value="Legs">Legs</option>
                                <option value="Feet">Feet</option>
                            </select>
                        </div>
                        <div className="space-y-1">
                            <Label>Defense</Label>
                            <Input type="number" value={data?.ArmorProperties?.Defense || 0} onChange={e => updateField('ArmorProperties.Defense', parseInt(e.target.value))} />
                        </div>
                        <div className="space-y-1">
                            <Label>Toughness</Label>
                            <Input type="number" value={data?.ArmorProperties?.Toughness || 0} onChange={e => updateField('ArmorProperties.Toughness', parseInt(e.target.value))} />
                        </div>
                    </div>
                </ComponentCard>
            )}

            {/* Food editor */}
            {(data?.FoodProperties) && (
                <ComponentCard title="Food Properties" icon={Apple} description="Nutrition stats">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <Label>Nutrition</Label>
                            <Input type="number" value={data?.FoodProperties?.Nutrition || 4} onChange={e => updateField('FoodProperties.Nutrition', parseInt(e.target.value))} />
                        </div>
                        <div className="space-y-1">
                            <Label>Saturation</Label>
                            <Input type="number" step="0.1" value={data?.FoodProperties?.Saturation || 2.4} onChange={e => updateField('FoodProperties.Saturation', parseFloat(e.target.value))} />
                        </div>
                        <div className="space-y-1">
                            <Label>Consume Time (s)</Label>
                            <Input type="number" step="0.1" value={data?.FoodProperties?.ConsumeTime || 1.6} onChange={e => updateField('FoodProperties.ConsumeTime', parseFloat(e.target.value))} />
                        </div>
                        <div className="flex items-center gap-2 pt-6">
                            <input
                                type="checkbox"
                                checked={data?.FoodProperties?.CanAlwaysEat ?? false}
                                onChange={e => updateField('FoodProperties.CanAlwaysEat', e.target.checked)}
                            />
                            <Label>Can Always Eat</Label>
                        </div>
                    </div>
                </ComponentCard>
            )}

            {/* Potion editor */}
            {(data?.PotionProperties) && (
                <ComponentCard title="Potion Properties" icon={FlaskConical} description="Effect settings">
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <Label>Duration (s)</Label>
                                <Input type="number" step="1" value={data?.PotionProperties?.Duration || 60} onChange={e => updateField('PotionProperties.Duration', parseFloat(e.target.value))} />
                            </div>
                            <div className="space-y-1">
                                <Label>Consume Time (s)</Label>
                                <Input type="number" step="0.1" value={data?.PotionProperties?.ConsumeTime || 1.2} onChange={e => updateField('PotionProperties.ConsumeTime', parseFloat(e.target.value))} />
                            </div>
                        </div>
                        <EffectsList
                            effects={data?.PotionProperties?.Effects || []}
                            onChange={(effects) => updateField('PotionProperties.Effects', effects)}
                        />
                    </div>
                </ComponentCard>
            )}

            {/* Fishing rod editor */}
            {(data?.FishingProperties) && (
                <ComponentCard title="Fishing Properties" icon={Zap} description="Fishing mechanics">
                    <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-1">
                            <Label>Cast Distance</Label>
                            <Input type="number" step="0.5" value={data?.FishingProperties?.CastDistance || 10.0} onChange={e => updateField('FishingProperties.CastDistance', parseFloat(e.target.value))} />
                        </div>
                        <div className="space-y-1">
                            <Label>Reel Speed</Label>
                            <Input type="number" step="0.1" value={data?.FishingProperties?.ReelSpeed || 1.0} onChange={e => updateField('FishingProperties.ReelSpeed', parseFloat(e.target.value))} />
                        </div>
                        <div className="space-y-1">
                            <Label>Lure Attraction</Label>
                            <Input type="number" step="0.1" value={data?.FishingProperties?.LureAttraction || 1.0} onChange={e => updateField('FishingProperties.LureAttraction', parseFloat(e.target.value))} />
                        </div>
                    </div>
                </ComponentCard>
            )}

            {/* Projectile item properties */}
            {(data?.ProjectileProperties) && (
                <ComponentCard title="Projectile Properties" icon={Rocket} description="Ammunition stats">
                    <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-1">
                            <Label>Damage</Label>
                            <Input type="number" value={data?.ProjectileProperties?.Damage || 5} onChange={e => updateField('ProjectileProperties.Damage', parseInt(e.target.value))} />
                        </div>
                        <div className="space-y-1">
                            <Label>Velocity</Label>
                            <Input type="number" step="0.5" value={data?.ProjectileProperties?.Velocity || 30.0} onChange={e => updateField('ProjectileProperties.Velocity', parseFloat(e.target.value))} />
                        </div>
                        <div className="space-y-1">
                            <Label>Gravity</Label>
                            <Input type="number" step="0.01" value={data?.ProjectileProperties?.Gravity || 0.05} onChange={e => updateField('ProjectileProperties.Gravity', parseFloat(e.target.value))} />
                        </div>
                    </div>
                </ComponentCard>
            )}

            {/* Cosmetic properties */}
            {(data?.CosmeticProperties) && (
                <ComponentCard title="Cosmetic Properties" icon={Sparkles} description="Visual slot settings">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <Label>Slot</Label>
                            <select
                                className="w-full bg-muted/30 border rounded-lg px-2 py-2 text-xs"
                                value={data?.CosmeticProperties?.Slot || 'Back'}
                                onChange={e => updateField('CosmeticProperties.Slot', e.target.value)}
                            >
                                <option value="Back">Back</option>
                                <option value="Head">Head</option>
                                <option value="Face">Face</option>
                                <option value="Shoulder">Shoulder</option>
                            </select>
                        </div>
                        <div className="flex items-center gap-2 pt-6">
                            <input
                                type="checkbox"
                                checked={data?.CosmeticProperties?.ClientOnly ?? true}
                                onChange={e => updateField('CosmeticProperties.ClientOnly', e.target.checked)}
                            />
                            <Label>Client Only</Label>
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

            {/* Crop Properties */}
            {(data?.CropProperties) && (
                <ComponentCard title="Crop Properties" icon={Sprout} description="Growth settings">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <Label>Growth Stages</Label>
                            <Input type="number" value={data?.CropProperties?.GrowthStages || 4} onChange={e => updateField('CropProperties.GrowthStages', parseInt(e.target.value))} />
                        </div>
                        <div className="space-y-1">
                            <Label>Growth Time (s)</Label>
                            <Input type="number" step="10" value={data?.CropProperties?.GrowthTime || 300} onChange={e => updateField('CropProperties.GrowthTime', parseFloat(e.target.value))} />
                        </div>
                        <div className="space-y-1">
                            <Label>Drop Item ID</Label>
                            <Input value={data?.CropProperties?.DropItem || ''} onChange={e => updateField('CropProperties.DropItem', e.target.value)} />
                        </div>
                        <div className="flex items-center gap-2 pt-6">
                            <input
                                type="checkbox"
                                checked={data?.CropProperties?.RequiresWater ?? true}
                                onChange={e => updateField('CropProperties.RequiresWater', e.target.checked)}
                            />
                            <Label>Requires Water</Label>
                        </div>
                    </div>
                </ComponentCard>
            )}

            {/* Container Properties */}
            {(data?.ContainerProperties) && (
                <ComponentCard title="Container Properties" icon={Archive} description="Storage settings">
                    <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-1">
                            <Label>Total Slots</Label>
                            <Input type="number" value={data?.ContainerProperties?.Slots || 27} onChange={e => updateField('ContainerProperties.Slots', parseInt(e.target.value))} />
                        </div>
                        <div className="space-y-1">
                            <Label>Rows</Label>
                            <Input type="number" value={data?.ContainerProperties?.Rows || 3} onChange={e => updateField('ContainerProperties.Rows', parseInt(e.target.value))} />
                        </div>
                        <div className="space-y-1">
                            <Label>Columns</Label>
                            <Input type="number" value={data?.ContainerProperties?.Columns || 9} onChange={e => updateField('ContainerProperties.Columns', parseInt(e.target.value))} />
                        </div>
                    </div>
                </ComponentCard>
            )}

            {/* Furniture Properties */}
            {(data?.FurnitureProperties) && (
                <ComponentCard title="Furniture Properties" icon={Layers} description="Interaction settings">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                checked={data?.FurnitureProperties?.CanSit ?? false}
                                onChange={e => updateField('FurnitureProperties.CanSit', e.target.checked)}
                            />
                            <Label>Can Sit</Label>
                        </div>
                        <div className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                checked={data?.FurnitureProperties?.CanInteract ?? true}
                                onChange={e => updateField('FurnitureProperties.CanInteract', e.target.checked)}
                            />
                            <Label>Can Interact</Label>
                        </div>
                    </div>
                </ComponentCard>
            )}
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
                        <PathInput
                            value={data?.Character?.Model || ''}
                            onChange={e => updateField('Character.Model', e)}
                            modRoot={modRoot}
                            placeholder="Lookups/Characters/..."
                            suggestedFolder="Common/Lookups/Characters"
                            pathPrefix="Common"
                            filters={[
                                { name: 'Blocky Models', extensions: ['blockymodel'] },
                                { name: 'All Files', extensions: ['*'] },
                            ]}
                            title="Select Entity Model"
                        />
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
                    {data?.Health !== undefined && (
                        <div className="space-y-1">
                            <Label>Health</Label>
                            <Input type="number" value={data?.Health || 100} onChange={e => updateField('Health', parseInt(e.target.value))} />
                        </div>
                    )}
                </div>
            </ComponentCard>

            {/* Flight Properties */}
            {(data?.FlightProperties) && (
                <ComponentCard title="Flight Properties" icon={Bird} description="Aerial movement">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <Label>Max Altitude</Label>
                            <Input type="number" value={data?.FlightProperties?.MaxAltitude || 100} onChange={e => updateField('FlightProperties.MaxAltitude', parseInt(e.target.value))} />
                        </div>
                        <div className="space-y-1">
                            <Label>Hover Speed</Label>
                            <Input type="number" step="0.1" value={data?.FlightProperties?.HoverSpeed || 2.0} onChange={e => updateField('FlightProperties.HoverSpeed', parseFloat(e.target.value))} />
                        </div>
                        <div className="flex items-center gap-2 col-span-2">
                            <input
                                type="checkbox"
                                checked={data?.FlightProperties?.CanLand ?? true}
                                onChange={e => updateField('FlightProperties.CanLand', e.target.checked)}
                            />
                            <Label>Can Land</Label>
                        </div>
                    </div>
                </ComponentCard>
            )}

            {/* Swimming Properties */}
            {(data?.SwimmingProperties) && (
                <ComponentCard title="Swimming Properties" icon={Zap} description="Aquatic movement">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <Label>Max Depth</Label>
                            <Input type="number" value={data?.SwimmingProperties?.MaxDepth || 50} onChange={e => updateField('SwimmingProperties.MaxDepth', parseInt(e.target.value))} />
                        </div>
                        <div className="space-y-1">
                            <Label>Swim Speed</Label>
                            <Input type="number" step="0.1" value={data?.SwimmingProperties?.SwimSpeed || 3.0} onChange={e => updateField('SwimmingProperties.SwimSpeed', parseFloat(e.target.value))} />
                        </div>
                        <div className="flex items-center gap-2 col-span-2">
                            <input
                                type="checkbox"
                                checked={data?.SwimmingProperties?.CanBreathUnderwater ?? true}
                                onChange={e => updateField('SwimmingProperties.CanBreathUnderwater', e.target.checked)}
                            />
                            <Label>Can Breath Underwater</Label>
                        </div>
                    </div>
                </ComponentCard>
            )}

            {/* Boss Properties */}
            {(data?.BossProperties) && (
                <ComponentCard title="Boss Properties" icon={Crown} description="Boss encounter settings">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <Label>Phases</Label>
                            <Input type="number" min="1" value={data?.BossProperties?.Phases || 1} onChange={e => updateField('BossProperties.Phases', parseInt(e.target.value))} />
                        </div>
                        <div className="space-y-1">
                            <Label>Music ID</Label>
                            <Input value={data?.BossProperties?.MusicId || ''} onChange={e => updateField('BossProperties.MusicId', e.target.value || null)} placeholder="Optional" />
                        </div>
                        <div className="flex items-center gap-2 col-span-2">
                            <input
                                type="checkbox"
                                checked={data?.BossProperties?.ShowHealthBar ?? true}
                                onChange={e => updateField('BossProperties.ShowHealthBar', e.target.checked)}
                            />
                            <Label>Show Health Bar</Label>
                        </div>
                    </div>
                </ComponentCard>
            )}
        </div>
    )
}

// --- Data Type Editors ---

function ProjectileDataEditor({ data, updateField, modRoot }: { data: AssetData | null, updateField: (p: string, v: unknown) => void, modRoot: string | null }) {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <ComponentCard title="Physics" icon={Rocket} description="Movement properties">
                <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-1">
                        <Label>Velocity</Label>
                        <Input type="number" step="0.5" value={data?.Physics?.Velocity || 30.0} onChange={e => updateField('Physics.Velocity', parseFloat(e.target.value))} />
                    </div>
                    <div className="space-y-1">
                        <Label>Gravity</Label>
                        <Input type="number" step="0.01" value={data?.Physics?.Gravity || 0.05} onChange={e => updateField('Physics.Gravity', parseFloat(e.target.value))} />
                    </div>
                    <div className="space-y-1">
                        <Label>Drag</Label>
                        <Input type="number" step="0.01" value={data?.Physics?.Drag || 0.01} onChange={e => updateField('Physics.Drag', parseFloat(e.target.value))} />
                    </div>
                </div>
            </ComponentCard>

            <ComponentCard title="Combat" icon={Shield} description="Damage properties">
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                        <Label>Damage</Label>
                        <Input type="number" value={data?.Damage || 5} onChange={e => updateField('Damage', parseInt(e.target.value))} />
                    </div>
                    <div className="space-y-1">
                        <Label>Lifetime (s)</Label>
                        <Input type="number" step="1" value={data?.Lifetime || 60.0} onChange={e => updateField('Lifetime', parseFloat(e.target.value))} />
                    </div>
                </div>
            </ComponentCard>

            <ComponentCard title="Visuals" icon={Layers} description="Model path">
                <div className="space-y-1">
                    <Label>Model Path</Label>
                    <PathInput
                        value={data?.Model || ''}
                        onChange={e => updateField('Model', e)}
                        modRoot={modRoot}
                        placeholder="Projectiles/..."
                        suggestedFolder="Common/Projectiles"
                        pathPrefix="Common"
                        filters={[
                            { name: 'Blocky Models', extensions: ['blockymodel'] },
                            { name: 'All Files', extensions: ['*'] },
                        ]}
                        title="Select Model"
                    />
                </div>
            </ComponentCard>
        </div>
    )
}

function DropEditor({ data, updateField, setData }: { data: AssetData | null, updateField: (p: string, v: unknown) => void, setData: (d: AssetData) => void }) {
    const items = data?.Items || []

    const addItem = () => {
        const newItems = [...items, { ItemId: 'New_Item', Weight: 1.0, Min: 1, Max: 1 }]
        setData({ ...data, Items: newItems })
    }

    const removeItem = (index: number) => {
        const newItems = items.filter((_: unknown, i: number) => i !== index)
        setData({ ...data, Items: newItems })
    }

    const updateItem = (index: number, field: string, value: unknown) => {
        const newItems = [...items]
        newItems[index] = { ...newItems[index], [field]: value }
        setData({ ...data, Items: newItems })
    }

    return (
        <div className="grid grid-cols-1 gap-6">
            <ComponentCard title="Drop Settings" icon={Dice5} description="Loot table configuration">
                <div className="space-y-4">
                    <div className="space-y-1">
                        <Label>Total Rolls</Label>
                        <Input type="number" min="1" value={data?.TotalRolls || 1} onChange={e => updateField('TotalRolls', parseInt(e.target.value))} />
                    </div>
                </div>
            </ComponentCard>

            <ComponentCard title="Items" icon={Layers} description="Weighted drop list">
                <div className="space-y-3">
                    {items.map((item: { ItemId: string, Weight: number, Min: number, Max: number }, index: number) => (
                        <div key={index} className="flex items-center gap-2 p-3 bg-muted/20 rounded-lg">
                            <div className="flex-1 grid grid-cols-4 gap-2">
                                <div className="space-y-1">
                                    <Label>Item ID</Label>
                                    <Input value={item.ItemId} onChange={e => updateItem(index, 'ItemId', e.target.value)} />
                                </div>
                                <div className="space-y-1">
                                    <Label>Weight</Label>
                                    <Input type="number" step="0.1" value={item.Weight} onChange={e => updateItem(index, 'Weight', parseFloat(e.target.value))} />
                                </div>
                                <div className="space-y-1">
                                    <Label>Min</Label>
                                    <Input type="number" min="0" value={item.Min} onChange={e => updateItem(index, 'Min', parseInt(e.target.value))} />
                                </div>
                                <div className="space-y-1">
                                    <Label>Max</Label>
                                    <Input type="number" min="1" value={item.Max} onChange={e => updateItem(index, 'Max', parseInt(e.target.value))} />
                                </div>
                            </div>
                            <button
                                onClick={() => removeItem(index)}
                                className="p-2 hover:bg-destructive/10 rounded-lg text-destructive"
                            >
                                <Trash2 className="h-4 w-4" />
                            </button>
                        </div>
                    ))}
                    <button
                        onClick={addItem}
                        className="w-full py-2 border-2 border-dashed rounded-lg text-muted-foreground hover:border-primary hover:text-primary flex items-center justify-center gap-2"
                    >
                        <Plus className="h-4 w-4" />
                        Add Item
                    </button>
                </div>
            </ComponentCard>
        </div>
    )
}

function RecipeEditor({ data, updateField }: { data: AssetData | null, updateField: (p: string, v: unknown) => void }) {
    const isShaped = data?.Type === 'Shaped' || data?.Pattern

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <ComponentCard title="Recipe Type" icon={Grid3X3} description="Recipe configuration">
                <div className="space-y-4">
                    <div className="space-y-1">
                        <Label>Type</Label>
                        <select
                            className="w-full bg-muted/30 border rounded-lg px-2 py-2 text-xs"
                            value={data?.Type || 'Shaped'}
                            onChange={e => updateField('Type', e.target.value)}
                        >
                            <option value="Shaped">Shaped</option>
                            <option value="Shapeless">Shapeless</option>
                        </select>
                    </div>
                </div>
            </ComponentCard>

            <ComponentCard title="Result" icon={Zap} description="Output item">
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                        <Label>Item ID</Label>
                        <Input value={data?.Result?.ItemId || ''} onChange={e => updateField('Result.ItemId', e.target.value)} />
                    </div>
                    <div className="space-y-1">
                        <Label>Count</Label>
                        <Input type="number" min="1" value={data?.Result?.Count || 1} onChange={e => updateField('Result.Count', parseInt(e.target.value))} />
                    </div>
                </div>
            </ComponentCard>

            {isShaped && (
                <ComponentCard title="Pattern" icon={Grid3X3} description="Crafting grid pattern">
                    <div className="space-y-2">
                        {[0, 1, 2].map(row => (
                            <div key={row} className="space-y-1">
                                <Label>Row {row + 1}</Label>
                                <Input
                                    value={data?.Pattern?.[row] || ''}
                                    onChange={e => {
                                        const newPattern = [...(data?.Pattern || ['', '', ''])]
                                        newPattern[row] = e.target.value
                                        updateField('Pattern', newPattern)
                                    }}
                                    placeholder="e.g., ###"
                                    maxLength={3}
                                    className="font-mono text-center"
                                />
                            </div>
                        ))}
                        <p className="text-[10px] text-muted-foreground mt-2">Use single characters to represent items. Define them in Key below.</p>
                    </div>
                </ComponentCard>
            )}

            {isShaped && (
                <ComponentCard title="Key" icon={Layers} description="Character to item mapping">
                    <div className="space-y-2">
                        {Object.entries(data?.Key || {}).map(([char, itemId]) => (
                            <div key={char} className="flex items-center gap-2">
                                <div className="w-12 text-center font-mono text-lg bg-muted/30 rounded px-2 py-1">{char}</div>
                                <span className="text-muted-foreground">=</span>
                                <Input
                                    className="flex-1"
                                    value={itemId as string}
                                    onChange={e => {
                                        const newKey = { ...data?.Key, [char]: e.target.value }
                                        updateField('Key', newKey)
                                    }}
                                />
                            </div>
                        ))}
                        <p className="text-[10px] text-muted-foreground">Add new key mappings by using new characters in the pattern.</p>
                    </div>
                </ComponentCard>
            )}

            {!isShaped && (
                <ComponentCard title="Ingredients" icon={Layers} description="Required items">
                    <div className="space-y-2">
                        {(data?.Ingredients || []).map((ingredient: string, index: number) => (
                            <div key={index} className="flex items-center gap-2">
                                <Input
                                    value={ingredient}
                                    onChange={e => {
                                        const newIngredients = [...(data?.Ingredients || [])]
                                        newIngredients[index] = e.target.value
                                        updateField('Ingredients', newIngredients)
                                    }}
                                />
                                <button
                                    onClick={() => {
                                        const newIngredients = (data?.Ingredients || []).filter((_: unknown, i: number) => i !== index)
                                        updateField('Ingredients', newIngredients)
                                    }}
                                    className="p-2 hover:bg-destructive/10 rounded-lg text-destructive"
                                >
                                    <Trash2 className="h-4 w-4" />
                                </button>
                            </div>
                        ))}
                        <button
                            onClick={() => {
                                const newIngredients = [...(data?.Ingredients || []), 'New_Item']
                                updateField('Ingredients', newIngredients)
                            }}
                            className="w-full py-2 border-2 border-dashed rounded-lg text-muted-foreground hover:border-primary hover:text-primary flex items-center justify-center gap-2"
                        >
                            <Plus className="h-4 w-4" />
                            Add Ingredient
                        </button>
                    </div>
                </ComponentCard>
            )}
        </div>
    )
}

function BarterEditor({ data, setData }: { data: AssetData | null, setData: (d: AssetData) => void }) {
    const trades = data?.Trades || []

    const addTrade = () => {
        const newTrades = [...trades, {
            Input: [{ ItemId: 'Currency', Count: 10 }],
            Output: [{ ItemId: 'New_Item', Count: 1 }],
            Stock: 16,
            MaxStock: 16,
            RestockTime: 1200.0
        }]
        setData({ ...data, Trades: newTrades })
    }

    const removeTrade = (index: number) => {
        const newTrades = trades.filter((_: unknown, i: number) => i !== index)
        setData({ ...data, Trades: newTrades })
    }

    const updateTrade = (index: number, field: string, value: unknown) => {
        const newTrades = [...trades]
        if (field.includes('.')) {
            const [parent, child, subField] = field.split('.')
            const arrIndex = parseInt(child)
            if (!newTrades[index][parent]) newTrades[index][parent] = []
            if (!newTrades[index][parent][arrIndex]) newTrades[index][parent][arrIndex] = {}
            newTrades[index][parent][arrIndex][subField] = value
        } else {
            newTrades[index] = { ...newTrades[index], [field]: value }
        }
        setData({ ...data, Trades: newTrades })
    }

    return (
        <div className="grid grid-cols-1 gap-6">
            <ComponentCard title="Shop Trades" icon={Store} description="NPC trade configuration">
                <div className="space-y-4">
                    {trades.map((trade: { Input: Array<{ItemId: string, Count: number}>, Output: Array<{ItemId: string, Count: number}>, Stock: number, MaxStock: number, RestockTime: number }, index: number) => (
                        <div key={index} className="p-4 bg-muted/20 rounded-lg space-y-3">
                            <div className="flex items-center justify-between">
                                <span className="text-sm font-bold">Trade #{index + 1}</span>
                                <button
                                    onClick={() => removeTrade(index)}
                                    className="p-1 hover:bg-destructive/10 rounded text-destructive"
                                >
                                    <Trash2 className="h-4 w-4" />
                                </button>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Input (Cost)</Label>
                                    <div className="flex gap-2">
                                        <Input
                                            value={trade.Input?.[0]?.ItemId || ''}
                                            onChange={e => updateTrade(index, 'Input.0.ItemId', e.target.value)}
                                            placeholder="Item ID"
                                            className="flex-1"
                                        />
                                        <Input
                                            type="number"
                                            min="1"
                                            value={trade.Input?.[0]?.Count || 1}
                                            onChange={e => updateTrade(index, 'Input.0.Count', parseInt(e.target.value))}
                                            className="w-20"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label>Output (Reward)</Label>
                                    <div className="flex gap-2">
                                        <Input
                                            value={trade.Output?.[0]?.ItemId || ''}
                                            onChange={e => updateTrade(index, 'Output.0.ItemId', e.target.value)}
                                            placeholder="Item ID"
                                            className="flex-1"
                                        />
                                        <Input
                                            type="number"
                                            min="1"
                                            value={trade.Output?.[0]?.Count || 1}
                                            onChange={e => updateTrade(index, 'Output.0.Count', parseInt(e.target.value))}
                                            className="w-20"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-3 gap-4">
                                <div className="space-y-1">
                                    <Label>Stock</Label>
                                    <Input type="number" min="0" value={trade.Stock || 16} onChange={e => updateTrade(index, 'Stock', parseInt(e.target.value))} />
                                </div>
                                <div className="space-y-1">
                                    <Label>Max Stock</Label>
                                    <Input type="number" min="1" value={trade.MaxStock || 16} onChange={e => updateTrade(index, 'MaxStock', parseInt(e.target.value))} />
                                </div>
                                <div className="space-y-1">
                                    <Label>Restock Time (s)</Label>
                                    <Input type="number" step="60" value={trade.RestockTime || 1200} onChange={e => updateTrade(index, 'RestockTime', parseFloat(e.target.value))} />
                                </div>
                            </div>
                        </div>
                    ))}
                    <button
                        onClick={addTrade}
                        className="w-full py-3 border-2 border-dashed rounded-lg text-muted-foreground hover:border-primary hover:text-primary flex items-center justify-center gap-2"
                    >
                        <Plus className="h-4 w-4" />
                        Add Trade
                    </button>
                </div>
            </ComponentCard>
        </div>
    )
}

// --- Reusable Components ---

interface EffectsListProps {
    effects: Array<{ EffectId: string, Duration?: number, Amplifier?: number }>
    onChange: (effects: Array<{ EffectId: string, Duration?: number, Amplifier?: number }>) => void
}

function EffectsList({ effects, onChange }: EffectsListProps) {
    const addEffect = () => {
        onChange([...effects, { EffectId: 'Speed', Duration: 60, Amplifier: 1 }])
    }

    const removeEffect = (index: number) => {
        onChange(effects.filter((_, i) => i !== index))
    }

    const updateEffect = (index: number, field: string, value: unknown) => {
        const newEffects = [...effects]
        newEffects[index] = { ...newEffects[index], [field]: value }
        onChange(newEffects)
    }

    return (
        <div className="space-y-2">
            <Label>Effects</Label>
            {effects.map((effect, index) => (
                <div key={index} className="flex items-center gap-2 p-2 bg-muted/20 rounded-lg">
                    <div className="flex-1 grid grid-cols-3 gap-2">
                        <div className="space-y-1">
                            <Label>Effect ID</Label>
                            <Input value={effect.EffectId} onChange={e => updateEffect(index, 'EffectId', e.target.value)} />
                        </div>
                        <div className="space-y-1">
                            <Label>Duration (s)</Label>
                            <Input type="number" value={effect.Duration || 60} onChange={e => updateEffect(index, 'Duration', parseFloat(e.target.value))} />
                        </div>
                        <div className="space-y-1">
                            <Label>Amplifier</Label>
                            <Input type="number" min="1" value={effect.Amplifier || 1} onChange={e => updateEffect(index, 'Amplifier', parseInt(e.target.value))} />
                        </div>
                    </div>
                    <button
                        onClick={() => removeEffect(index)}
                        className="p-2 hover:bg-destructive/10 rounded-lg text-destructive"
                    >
                        <Trash2 className="h-4 w-4" />
                    </button>
                </div>
            ))}
            <button
                onClick={addEffect}
                className="w-full py-2 border-2 border-dashed rounded-lg text-muted-foreground hover:border-primary hover:text-primary flex items-center justify-center gap-2"
            >
                <Plus className="h-4 w-4" />
                Add Effect
            </button>
        </div>
    )
}

function Label({ children }: { children: React.ReactNode }) {
    return <label className="text-[10px] font-bold uppercase text-muted-foreground block mb-1">{children}</label>
}

// Path Input Component with validation feedback and file picker
interface PathInputProps {
    value: string
    onChange: (val: string) => void
    modRoot: string | null
    placeholder?: string
    /** Suggested subfolder relative to modRoot (e.g., "Common/Icons/ItemsGenerated") */
    suggestedFolder?: string
    /** File type filters for the picker */
    filters?: Array<{ name: string; extensions: string[] }>
    /** Dialog title */
    title?: string
    /**
     * Path prefix that gets prepended for file system operations (validation, browsing)
     * but stripped from the stored value. E.g., "Common" means files are at
     * <modRoot>/Common/<value> but JSON stores just <value>.
     */
    pathPrefix?: string
}

function PathInput(props: PathInputProps) {
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
                const normalizedPrefix = props.pathPrefix?.replace(/\\/g, '/') || ''
                const sep = '/'

                // Build full path: modRoot + pathPrefix + value
                let fullPath = normalizedRoot
                if (!fullPath.endsWith(sep)) fullPath += sep
                if (normalizedPrefix) {
                    fullPath += normalizedPrefix
                    if (!fullPath.endsWith(sep)) fullPath += sep
                }
                fullPath += normalizedValue

                setCheckedPath(fullPath)
                const exists = await window.hymn.checkPathExists(fullPath)
                setIsValid(exists)

                // Show error with a slight delay for smoother UX
                if (!exists) {
                    setTimeout(() => setShowError(true), 50)
                }
            } catch {
                setIsValid(false)
                setCheckedPath(null)
                setTimeout(() => setShowError(true), 50)
            } finally {
                setIsChecking(false)
            }
        }

        const timeout = setTimeout(checkPath, 400)
        return () => clearTimeout(timeout)
    }, [props.value, props.modRoot, props.pathPrefix])

    const handleBrowse = async () => {
        if (!props.modRoot) return

        // Compute the starting directory
        const normalizedRoot = props.modRoot.replace(/\\/g, '/')
        const normalizedPrefix = props.pathPrefix?.replace(/\\/g, '/') || ''
        const baseDir = normalizedPrefix
            ? normalizedRoot + '/' + normalizedPrefix
            : normalizedRoot
        let defaultPath = baseDir

        // If there's a current value, try to start from its parent directory
        if (props.value) {
            const normalizedValue = props.value.replace(/\\/g, '/')
            const parentDir = normalizedValue.includes('/')
                ? normalizedValue.substring(0, normalizedValue.lastIndexOf('/'))
                : ''
            if (parentDir) {
                defaultPath = baseDir + '/' + parentDir
            }
        } else if (props.suggestedFolder) {
            // Otherwise use the suggested folder (already includes pathPrefix in our new convention)
            defaultPath = normalizedRoot + '/' + props.suggestedFolder.replace(/\\/g, '/')
        }

        try {
            const result = await window.hymn.selectAssetFile({
                defaultPath,
                modRoot: normalizedRoot,
                filters: props.filters,
                title: props.title,
            })

            if (result.relativePath) {
                let finalPath = result.relativePath
                // Strip pathPrefix from the returned path if present
                if (normalizedPrefix) {
                    const prefixWithSlash = normalizedPrefix + '/'
                    if (finalPath.startsWith(prefixWithSlash)) {
                        finalPath = finalPath.substring(prefixWithSlash.length)
                    } else if (finalPath === normalizedPrefix) {
                        finalPath = ''
                    }
                }
                props.onChange(finalPath)
            }
        } catch (err) {
            console.error('Failed to open file picker:', err)
        }
    }

    return (
        <div className="space-y-2">
            <div className="relative group">
                <div className="flex gap-2">
                    <input
                        className={cn(
                            "flex-1 bg-muted/30 border rounded-lg pl-3 pr-10 py-2 text-sm font-mono",
                            "focus:outline-none focus:ring-2 focus:bg-background transition-all duration-200",
                            isValid === null && "focus:ring-primary/50",
                            isValid === false && "border-destructive/60 focus:ring-destructive/50 bg-destructive/5",
                            isValid === true && "border-emerald-500/40 focus:ring-emerald-500/50 bg-emerald-500/5"
                        )}
                        value={props.value}
                        onChange={(e) => props.onChange(e.target.value.replace(/\\/g, '/'))}
                        placeholder={props.placeholder}
                    />
                    <button
                        type="button"
                        onClick={handleBrowse}
                        disabled={!props.modRoot}
                        className={cn(
                            "px-3 py-2 rounded-lg border bg-muted/30 transition-colors",
                            "hover:bg-muted/50 focus:outline-none focus:ring-2 focus:ring-primary/50",
                            "disabled:opacity-50 disabled:cursor-not-allowed"
                        )}
                        title="Browse for file"
                    >
                        <FolderOpen className="h-4 w-4 text-muted-foreground" />
                    </button>
                </div>

                {/* Status indicator */}
                <div className="absolute right-14 top-1/2 -translate-y-1/2 pointer-events-none">
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
            </div>

            {/* File not found error - inline, pushes content down */}
            {!isChecking && isValid === false && showError && (
                <div className="animate-in fade-in-0 slide-in-from-top-1 duration-200">
                    <div className="bg-card border border-destructive/30 rounded-lg overflow-hidden">
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-destructive/10">
                            <FileX className="h-3.5 w-3.5 text-destructive shrink-0" />
                            <span className="text-xs font-medium text-destructive">File Not Found</span>
                            {checkedPath && (
                                <code className="ml-auto text-[10px] font-mono text-muted-foreground truncate max-w-[300px]" title={checkedPath}>
                                    {checkedPath}
                                </code>
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
        <div className="bg-card/40 rounded-2xl">
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
