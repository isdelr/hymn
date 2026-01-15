import { useEffect, useMemo, useState } from 'react'
import {
  Check,
  Code,
  FileJson,
  FolderOpen,
  Hammer,
  Image,
  Package,
  Plus,
  RefreshCw,
  X,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { useAppContext } from '@/context/AppContext'
import { cn } from '@/lib/utils'
import type {
  CreatePackOptions,
  ModAsset,
  ModAssetKind,
  ModBuildResult,
  ModEntry,
  PackManifest,
  ServerAsset,
  ServerAssetKind,
  ServerAssetTemplate,
} from '@/shared/hymn-types'

const assetKindLabels: Record<ModAssetKind, string> = {
  texture: 'Texture',
  model: 'Model',
  animation: 'Animation',
  audio: 'Audio',
  other: 'Other',
}

const serverAssetKindLabels: Record<ServerAssetKind, string> = {
  item: 'Item',
  block: 'Block',
  category: 'Category',
  other: 'Other',
}

const serverAssetTemplates: Array<{ value: ServerAssetTemplate; label: string; folder: string }> = [
  { value: 'item', label: 'Item', folder: 'Server/Item/Items' },
  { value: 'block', label: 'Block', folder: 'Server/Item/Blocks' },
  { value: 'category', label: 'Category', folder: 'Server/Item/Category' },
  { value: 'empty', label: 'Empty JSON', folder: 'Server/Item/Items' },
]

const formatBytes = (size: number | null) => {
  if (!size) return '—'
  if (size < 1024) return `${size} B`
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`
  return `${(size / (1024 * 1024)).toFixed(1)} MB`
}

const normalizeFolderInput = (value: string) => {
  const normalized = value.replace(/\\/g, '/').replace(/\/+$/, '').trim()
  if (!normalized) return 'Server'
  if (normalized.toLowerCase().startsWith('server/')) return normalized
  if (normalized.toLowerCase() === 'server') return 'Server'
  return `Server/${normalized}`
}

const ensureJsonFileName = (name: string) => {
  const trimmed = name.trim()
  if (!trimmed) return ''
  return trimmed.toLowerCase().endsWith('.json') ? trimmed : `${trimmed}.json`
}

const buildManifestTemplate = (entry: ModEntry | null) => {
  const base: Partial<PackManifest> = {
    Name: entry?.name ?? 'NewPack',
    Group: entry?.group,
    Version: entry?.version ?? '1.0.0',
    Description: entry?.description,
    Main: entry?.entryPoint ?? undefined,
    IncludesAssetPack: entry?.includesAssetPack ? true : undefined,
  }
  const cleaned = Object.fromEntries(
    Object.entries(base).filter(([, value]) => value !== undefined && value !== ''),
  ) as Record<string, unknown>
  return JSON.stringify(cleaned, null, 2)
}

export function CreateSection() {
  const { state, actions } = useAppContext()
  const { installInfo, scanResult } = state

  // Pack Wizard State
  const [packName, setPackName] = useState('')
  const [packGroup, setPackGroup] = useState('')
  const [packVersion, setPackVersion] = useState('1.0.0')
  const [packDescription, setPackDescription] = useState('')
  const [authorName, setAuthorName] = useState('')
  const [packLocation, setPackLocation] = useState<'packs' | 'mods'>('packs')
  const [includeCommon, setIncludeCommon] = useState(true)
  const [includeServer, setIncludeServer] = useState(true)
  const [isCreating, setIsCreating] = useState(false)
  const [createResult, setCreateResult] = useState<{ success: boolean; path?: string; error?: string } | null>(null)

  // Manifest Editor State
  const [manifestJson, setManifestJson] = useState<string>(
    JSON.stringify({ Name: 'MyPack', Group: 'MyGroup', Version: '1.0.0' }, null, 2)
  )
  const [manifestError, setManifestError] = useState<string | null>(null)
  const [manifestTargetPath, setManifestTargetPath] = useState('')
  const [manifestStatus, setManifestStatus] = useState<string | null>(null)
  const [manifestReadOnly, setManifestReadOnly] = useState(false)
  const [isManifestLoading, setIsManifestLoading] = useState(false)
  const [isManifestSaving, setIsManifestSaving] = useState(false)

  // Asset Browser State
  const [assetTargetPath, setAssetTargetPath] = useState('')
  const [assetFilter, setAssetFilter] = useState<'all' | ModAssetKind>('all')
  const [assetItems, setAssetItems] = useState<ModAsset[]>([])
  const [isAssetLoading, setIsAssetLoading] = useState(false)

  // Server Assets State
  const [serverTargetPath, setServerTargetPath] = useState('')
  const [serverAssets, setServerAssets] = useState<ServerAsset[]>([])
  const [serverFilter, setServerFilter] = useState('')
  const [selectedServerAssetId, setSelectedServerAssetId] = useState<string | null>(null)
  const [newServerAssetName, setNewServerAssetName] = useState('')
  const [newServerAssetFolder, setNewServerAssetFolder] = useState(serverAssetTemplates[0].folder)
  const [newServerAssetTemplate, setNewServerAssetTemplate] = useState<ServerAssetTemplate>('item')
  const [serverStatus, setServerStatus] = useState<string | null>(null)
  const [isServerLoading, setIsServerLoading] = useState(false)
  const [isServerMutating, setIsServerMutating] = useState(false)

  // Build State
  const [buildTargetPath, setBuildTargetPath] = useState('')
  const [buildTask, setBuildTask] = useState('build')
  const [buildResult, setBuildResult] = useState<ModBuildResult | null>(null)
  const [buildError, setBuildError] = useState<string | null>(null)
  const [isBuilding, setIsBuilding] = useState(false)

  // Computed values
  const modEntries = useMemo(() => {
    return [...(scanResult?.entries ?? [])].sort((a, b) => a.name.localeCompare(b.name))
  }, [scanResult])

  const directoryEntries = useMemo(() => {
    return modEntries.filter((entry) => entry.format === 'directory')
  }, [modEntries])

  const entriesByPath = useMemo(() => {
    return new Map(modEntries.map((entry) => [entry.path, entry]))
  }, [modEntries])

  const manifestEntry = entriesByPath.get(manifestTargetPath) ?? null
  const assetEntry = entriesByPath.get(assetTargetPath) ?? null
  const serverEntry = entriesByPath.get(serverTargetPath) ?? null
  const buildEntry = entriesByPath.get(buildTargetPath) ?? null

  const filteredAssets = useMemo(() => {
    if (assetFilter === 'all') return assetItems
    return assetItems.filter((asset) => asset.kind === assetFilter)
  }, [assetFilter, assetItems])

  const filteredServerAssets = useMemo(() => {
    if (!serverFilter.trim()) return serverAssets
    const lowered = serverFilter.toLowerCase()
    return serverAssets.filter((asset) => {
      return asset.name.toLowerCase().includes(lowered) || asset.relativePath.toLowerCase().includes(lowered)
    })
  }, [serverAssets, serverFilter])

  const selectedServerAsset = useMemo(() => {
    return serverAssets.find((asset) => asset.id === selectedServerAssetId) ?? null
  }, [serverAssets, selectedServerAssetId])

  // Template folder sync
  useEffect(() => {
    const template = serverAssetTemplates.find((entry) => entry.value === newServerAssetTemplate)
    if (template) {
      setNewServerAssetFolder(template.folder)
    }
  }, [newServerAssetTemplate])

  // Handlers
  const handleCreatePack = async () => {
    if (!packName.trim()) {
      setCreateResult({ success: false, error: 'Pack name is required.' })
      return
    }

    setIsCreating(true)
    setCreateResult(null)

    try {
      const options: CreatePackOptions = {
        name: packName,
        group: packGroup || undefined,
        version: packVersion || '1.0.0',
        description: packDescription || undefined,
        authorName: authorName || undefined,
        location: packLocation,
        includeCommon,
        includeServer,
      }

      const result = await window.hymn.createPack(options)
      setCreateResult({ success: true, path: result.path })
      setPackName('')
      setPackGroup('')
      setPackVersion('1.0.0')
      setPackDescription('')
      setAuthorName('')
      await actions.runScan()
    } catch (error) {
      setCreateResult({ success: false, error: error instanceof Error ? error.message : 'Failed to create pack.' })
    } finally {
      setIsCreating(false)
    }
  }

  const handleLoadManifest = async () => {
    if (!manifestEntry) return
    setIsManifestLoading(true)
    setManifestError(null)
    setManifestStatus(null)

    try {
      const result = await window.hymn.getModManifest({
        path: manifestEntry.path,
        format: manifestEntry.format,
      })
      setManifestReadOnly(result.readOnly)
      setManifestJson(result.content ?? buildManifestTemplate(manifestEntry))
    } catch (error) {
      setManifestError(error instanceof Error ? error.message : 'Unable to load manifest.')
    } finally {
      setIsManifestLoading(false)
    }
  }

  const handleSaveManifest = async () => {
    if (!manifestEntry || manifestReadOnly) return
    try {
      JSON.parse(manifestJson)
    } catch {
      setManifestError('Invalid JSON syntax.')
      return
    }

    setIsManifestSaving(true)
    setManifestError(null)

    try {
      await window.hymn.saveModManifest({
        path: manifestEntry.path,
        format: manifestEntry.format,
        content: manifestJson,
      })
      setManifestStatus('Manifest saved successfully.')
      await actions.runScan()
    } catch (error) {
      setManifestError(error instanceof Error ? error.message : 'Unable to save manifest.')
    } finally {
      setIsManifestSaving(false)
    }
  }

  const handleLoadAssets = async () => {
    if (!assetEntry) return
    setIsAssetLoading(true)

    try {
      const result = await window.hymn.listModAssets({
        path: assetEntry.path,
        format: assetEntry.format,
        includePreviews: true,
        maxPreviews: 36,
        maxPreviewBytes: 600_000,
        maxAssets: 240,
      })
      setAssetItems(result.assets)
      setAssetFilter('all')
    } catch {
      setAssetItems([])
    } finally {
      setIsAssetLoading(false)
    }
  }

  const handleLoadServerAssets = async () => {
    if (!serverEntry) return
    setIsServerLoading(true)
    setServerStatus(null)

    try {
      const result = await window.hymn.listServerAssets({
        path: serverEntry.path,
        maxAssets: 320,
      })
      setServerAssets(result.assets)
      setSelectedServerAssetId(null)
    } catch {
      setServerAssets([])
    } finally {
      setIsServerLoading(false)
    }
  }

  const handleCreateServerAsset = async () => {
    if (!serverEntry) return
    const assetName = ensureJsonFileName(newServerAssetName)
    if (!assetName) {
      setServerStatus('Asset name is required.')
      return
    }

    setIsServerMutating(true)
    setServerStatus(null)

    try {
      const result = await window.hymn.createServerAsset({
        path: serverEntry.path,
        destination: normalizeFolderInput(newServerAssetFolder),
        name: assetName,
        template: newServerAssetTemplate,
      })
      setServerAssets((prev) => [...prev, result.asset].sort((a, b) => a.relativePath.localeCompare(b.relativePath)))
      setServerStatus('Asset created successfully.')
      setNewServerAssetName('')
    } catch (error) {
      setServerStatus(error instanceof Error ? error.message : 'Unable to create asset.')
    } finally {
      setIsServerMutating(false)
    }
  }

  const handleDeleteServerAsset = async () => {
    if (!serverEntry || !selectedServerAsset) return
    setIsServerMutating(true)
    setServerStatus(null)

    try {
      await window.hymn.deleteServerAsset({
        path: serverEntry.path,
        relativePath: selectedServerAsset.relativePath,
      })
      setServerAssets((prev) => prev.filter((asset) => asset.id !== selectedServerAsset.id))
      setSelectedServerAssetId(null)
      setServerStatus('Asset deleted.')
    } catch (error) {
      setServerStatus(error instanceof Error ? error.message : 'Unable to delete asset.')
    } finally {
      setIsServerMutating(false)
    }
  }

  const handleRunBuild = async () => {
    if (!buildEntry) return
    setIsBuilding(true)
    setBuildError(null)
    setBuildResult(null)

    try {
      const result = await window.hymn.buildMod({ path: buildEntry.path, task: buildTask })
      setBuildResult(result)
    } catch (error) {
      setBuildError(error instanceof Error ? error.message : 'Build failed.')
    } finally {
      setIsBuilding(false)
    }
  }

  const hasInstall = !!installInfo?.activePath

  if (!hasInstall) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <Package className="mb-4 h-12 w-12 text-muted-foreground/50" />
        <h2 className="mb-2 text-lg font-medium">No Install Detected</h2>
        <p className="text-sm text-muted-foreground">
          Configure your Hytale install path in Settings to start creating mods.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Tabs defaultValue="pack" className="space-y-6">
        <TabsList className="w-fit">
          <TabsTrigger value="pack" className="gap-2">
            <Package className="h-4 w-4" />
            New Pack
          </TabsTrigger>
          <TabsTrigger value="manifest" className="gap-2">
            <FileJson className="h-4 w-4" />
            Manifest
          </TabsTrigger>
          <TabsTrigger value="assets" className="gap-2">
            <Image className="h-4 w-4" />
            Assets
          </TabsTrigger>
          <TabsTrigger value="server" className="gap-2">
            <Code className="h-4 w-4" />
            Server Data
          </TabsTrigger>
          <TabsTrigger value="build" className="gap-2">
            <Hammer className="h-4 w-4" />
            Build
          </TabsTrigger>
        </TabsList>

        {/* New Pack Wizard */}
        <TabsContent value="pack">
          <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
            <Card>
              <CardHeader>
                <CardTitle>Create New Pack</CardTitle>
                <CardDescription>
                  Generate a new mod pack with manifest and folder structure.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="pack-name">Pack Name *</Label>
                    <Input
                      id="pack-name"
                      value={packName}
                      onChange={(e) => setPackName(e.target.value)}
                      placeholder="MyAwesomePack"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="pack-group">Group</Label>
                    <Input
                      id="pack-group"
                      value={packGroup}
                      onChange={(e) => setPackGroup(e.target.value)}
                      placeholder="com.example"
                    />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="pack-version">Version</Label>
                    <Input
                      id="pack-version"
                      value={packVersion}
                      onChange={(e) => setPackVersion(e.target.value)}
                      placeholder="1.0.0"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="author-name">Author</Label>
                    <Input
                      id="author-name"
                      value={authorName}
                      onChange={(e) => setAuthorName(e.target.value)}
                      placeholder="Your name"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="pack-description">Description</Label>
                  <Textarea
                    id="pack-description"
                    value={packDescription}
                    onChange={(e) => setPackDescription(e.target.value)}
                    placeholder="What does this pack do?"
                    rows={2}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="pack-location">Location</Label>
                  <Select value={packLocation} onValueChange={(v) => setPackLocation(v as 'packs' | 'mods')}>
                    <SelectTrigger id="pack-location">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="packs">UserData/Packs (data packs)</SelectItem>
                      <SelectItem value="mods">UserData/Mods (plugins)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Separator />

                <div className="space-y-3">
                  <Label>Folder Structure</Label>
                  <div className="flex flex-col gap-2">
                    <label className="flex items-center gap-2 text-sm">
                      <Checkbox
                        checked={includeCommon}
                        onCheckedChange={(checked) => setIncludeCommon(checked === true)}
                      />
                      Include Common folder (textures, models)
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                      <Checkbox
                        checked={includeServer}
                        onCheckedChange={(checked) => setIncludeServer(checked === true)}
                      />
                      Include Server folder (items, blocks)
                    </label>
                  </div>
                </div>

                <Button onClick={handleCreatePack} disabled={isCreating || !packName.trim()} className="w-full">
                  {isCreating ? (
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Plus className="mr-2 h-4 w-4" />
                  )}
                  {isCreating ? 'Creating...' : 'Create Pack'}
                </Button>

                {createResult && (
                  <div
                    className={cn(
                      'flex items-center gap-2 rounded-lg p-3 text-sm',
                      createResult.success ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'
                    )}
                  >
                    {createResult.success ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
                    {createResult.success ? 'Pack created successfully!' : createResult.error}
                    {createResult.path && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="ml-auto h-7"
                        onClick={() => window.hymn.openInExplorer(createResult.path!)}
                      >
                        <FolderOpen className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="h-fit bg-muted/30">
              <CardHeader>
                <CardTitle className="text-sm">Quick Tips</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-xs text-muted-foreground">
                <p>
                  <strong>Pack Name</strong> - Choose a unique name for your mod.
                </p>
                <p>
                  <strong>Group</strong> - Use reverse domain notation (com.yourname).
                </p>
                <p>
                  <strong>Common</strong> - Contains textures, models, and animations.
                </p>
                <p>
                  <strong>Server</strong> - Contains items, blocks, and game logic.
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Manifest Editor */}
        <TabsContent value="manifest">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Load Manifest</CardTitle>
                <CardDescription>Select a mod to edit its manifest.json file.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Select
                  value={manifestTargetPath}
                  onValueChange={(value) => {
                    setManifestTargetPath(value)
                    setManifestError(null)
                    setManifestStatus(null)
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a mod..." />
                  </SelectTrigger>
                  <SelectContent>
                    {modEntries.map((entry) => (
                      <SelectItem key={entry.path} value={entry.path}>
                        {entry.name} ({entry.format})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {manifestEntry && (
                  <div className="rounded-lg border bg-muted/30 p-3 text-xs">
                    <p className="font-medium">{manifestEntry.name}</p>
                    <p className="text-muted-foreground">
                      {manifestEntry.type} • {manifestEntry.format}
                    </p>
                  </div>
                )}

                <div className="flex gap-2">
                  <Button
                    onClick={handleLoadManifest}
                    disabled={!manifestEntry || isManifestLoading}
                    className="flex-1"
                  >
                    {isManifestLoading ? 'Loading...' : 'Load Manifest'}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => manifestEntry && window.hymn.openInExplorer(manifestEntry.path)}
                    disabled={!manifestEntry}
                  >
                    <FolderOpen className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Manifest Editor</CardTitle>
                {manifestReadOnly && <Badge variant="outline">Read-only</Badge>}
              </CardHeader>
              <CardContent className="space-y-4">
                <Textarea
                  value={manifestJson}
                  onChange={(e) => {
                    setManifestJson(e.target.value)
                    setManifestError(null)
                    setManifestStatus(null)
                  }}
                  className="min-h-[280px] font-mono text-xs"
                  placeholder='{"Name": "MyPack", ...}'
                />

                {manifestError && (
                  <p className="text-xs text-destructive">{manifestError}</p>
                )}
                {manifestStatus && (
                  <p className="text-xs text-success">{manifestStatus}</p>
                )}

                <div className="flex gap-2">
                  <Button
                    onClick={handleSaveManifest}
                    disabled={!manifestEntry || isManifestSaving || manifestReadOnly}
                    className="flex-1"
                  >
                    {isManifestSaving ? 'Saving...' : 'Save Manifest'}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      try {
                        const parsed = JSON.parse(manifestJson)
                        setManifestJson(JSON.stringify(parsed, null, 2))
                        setManifestError(null)
                      } catch {
                        setManifestError('Invalid JSON')
                      }
                    }}
                  >
                    Format
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Asset Browser */}
        <TabsContent value="assets">
          <Card>
            <CardHeader>
              <CardTitle>Asset Browser</CardTitle>
              <CardDescription>Preview textures, models, and other assets in your mods.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-3">
                <Select
                  value={assetTargetPath}
                  onValueChange={(value) => {
                    setAssetTargetPath(value)
                    setAssetItems([])
                  }}
                >
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Select a mod..." />
                  </SelectTrigger>
                  <SelectContent>
                    {modEntries.map((entry) => (
                      <SelectItem key={entry.path} value={entry.path}>
                        {entry.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={assetFilter} onValueChange={(v) => setAssetFilter(v as 'all' | ModAssetKind)}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="texture">Textures</SelectItem>
                    <SelectItem value="model">Models</SelectItem>
                    <SelectItem value="animation">Animations</SelectItem>
                    <SelectItem value="audio">Audio</SelectItem>
                  </SelectContent>
                </Select>

                <Button onClick={handleLoadAssets} disabled={!assetEntry || isAssetLoading}>
                  {isAssetLoading ? <RefreshCw className="h-4 w-4 animate-spin" /> : 'Load'}
                </Button>
              </div>

              {filteredAssets.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-12 text-center">
                  <Image className="mb-3 h-8 w-8 text-muted-foreground/50" />
                  <p className="text-sm text-muted-foreground">
                    {assetEntry ? 'No assets found. Click Load to scan.' : 'Select a mod to browse assets.'}
                  </p>
                </div>
              ) : (
                <ScrollArea className="h-[400px]">
                  <div className="grid gap-3 pr-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
                    {filteredAssets.map((asset) => (
                      <div key={asset.id} className="rounded-lg border bg-card p-2">
                        <div className="flex h-20 items-center justify-center rounded-md bg-black/20">
                          {asset.previewDataUrl ? (
                            <img
                              src={asset.previewDataUrl}
                              alt={asset.name}
                              className="h-full w-full rounded-md object-contain"
                            />
                          ) : (
                            <span className="text-[10px] text-muted-foreground">No preview</span>
                          )}
                        </div>
                        <p className="mt-1.5 truncate text-xs font-medium">{asset.name}</p>
                        <p className="truncate text-[10px] text-muted-foreground">{assetKindLabels[asset.kind]}</p>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Server Data */}
        <TabsContent value="server">
          <div className="grid gap-6 lg:grid-cols-[1fr_350px]">
            <Card>
              <CardHeader>
                <CardTitle>Server Assets</CardTitle>
                <CardDescription>Manage JSON assets for items, blocks, and categories.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-3">
                  <Select
                    value={serverTargetPath}
                    onValueChange={(value) => {
                      setServerTargetPath(value)
                      setServerAssets([])
                      setSelectedServerAssetId(null)
                    }}
                  >
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Select a directory mod..." />
                    </SelectTrigger>
                    <SelectContent>
                      {directoryEntries.map((entry) => (
                        <SelectItem key={entry.path} value={entry.path}>
                          {entry.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Button onClick={handleLoadServerAssets} disabled={!serverEntry || isServerLoading}>
                    {isServerLoading ? <RefreshCw className="h-4 w-4 animate-spin" /> : 'Load'}
                  </Button>
                </div>

                <Input
                  value={serverFilter}
                  onChange={(e) => setServerFilter(e.target.value)}
                  placeholder="Filter assets..."
                />

                <ScrollArea className="h-[300px] rounded-lg border">
                  {filteredServerAssets.length === 0 ? (
                    <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
                      {serverEntry ? 'No server assets found.' : 'Select a mod to load assets.'}
                    </div>
                  ) : (
                    <div className="space-y-1 p-2">
                      {filteredServerAssets.map((asset) => (
                        <button
                          key={asset.id}
                          onClick={() => setSelectedServerAssetId(asset.id)}
                          className={cn(
                            'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm transition-colors',
                            selectedServerAssetId === asset.id
                              ? 'bg-primary/10 text-primary'
                              : 'hover:bg-muted'
                          )}
                        >
                          <FileJson className="h-4 w-4 shrink-0" />
                          <div className="min-w-0 flex-1">
                            <p className="truncate font-medium">{asset.name}</p>
                            <p className="truncate text-xs text-muted-foreground">{asset.relativePath}</p>
                          </div>
                          <Badge variant="outline" className="shrink-0 text-xs">
                            {serverAssetKindLabels[asset.kind]}
                          </Badge>
                        </button>
                      ))}
                    </div>
                  )}
                </ScrollArea>

                {serverStatus && (
                  <p className={cn('text-xs', serverStatus.includes('success') || serverStatus.includes('created') || serverStatus.includes('deleted') ? 'text-success' : 'text-destructive')}>
                    {serverStatus}
                  </p>
                )}
              </CardContent>
            </Card>

            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Create New Asset</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Select
                    value={newServerAssetTemplate}
                    onValueChange={(v) => setNewServerAssetTemplate(v as ServerAssetTemplate)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {serverAssetTemplates.map((t) => (
                        <SelectItem key={t.value} value={t.value}>
                          {t.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Input
                    value={newServerAssetName}
                    onChange={(e) => setNewServerAssetName(e.target.value)}
                    placeholder="Asset name..."
                  />

                  <Input
                    value={newServerAssetFolder}
                    onChange={(e) => setNewServerAssetFolder(e.target.value)}
                    placeholder="Server/Item/Items"
                  />

                  <Button
                    onClick={handleCreateServerAsset}
                    disabled={!serverEntry || isServerMutating || !newServerAssetName.trim()}
                    className="w-full"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Create Asset
                  </Button>
                </CardContent>
              </Card>

              {selectedServerAsset && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Selected Asset</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="text-xs">
                      <p className="font-medium">{selectedServerAsset.name}</p>
                      <p className="text-muted-foreground">{selectedServerAsset.relativePath}</p>
                      <p className="text-muted-foreground">{formatBytes(selectedServerAsset.size)}</p>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => window.hymn.openInExplorer(selectedServerAsset.absolutePath)}
                      >
                        <FolderOpen className="mr-2 h-4 w-4" />
                        Open
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={handleDeleteServerAsset}
                        disabled={isServerMutating}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </TabsContent>

        {/* Build */}
        <TabsContent value="build">
          <Card>
            <CardHeader>
              <CardTitle>Mod Build</CardTitle>
              <CardDescription>Run Gradle tasks for plugin development.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-3">
                <Select
                  value={buildTargetPath}
                  onValueChange={(value) => {
                    setBuildTargetPath(value)
                    setBuildResult(null)
                    setBuildError(null)
                  }}
                >
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Select workspace..." />
                  </SelectTrigger>
                  <SelectContent>
                    {directoryEntries.map((entry) => (
                      <SelectItem key={entry.path} value={entry.path}>
                        {entry.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Input
                  value={buildTask}
                  onChange={(e) => setBuildTask(e.target.value)}
                  placeholder="Task (e.g., build)"
                  className="w-32"
                />

                <Button onClick={handleRunBuild} disabled={!buildEntry || isBuilding}>
                  {isBuilding ? (
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Hammer className="mr-2 h-4 w-4" />
                  )}
                  {isBuilding ? 'Building...' : 'Build'}
                </Button>

                <Button
                  variant="outline"
                  onClick={() => buildEntry && window.hymn.openInExplorer(buildEntry.path)}
                  disabled={!buildEntry}
                >
                  <FolderOpen className="h-4 w-4" />
                </Button>
              </div>

              {buildError && (
                <p className="text-sm text-destructive">{buildError}</p>
              )}

              {buildResult && (
                <div className="rounded-lg border bg-muted/30 p-4">
                  <div className="mb-3 flex items-center gap-2">
                    <Badge variant={buildResult.success ? 'default' : 'destructive'}>
                      {buildResult.success ? 'Success' : 'Failed'}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {(buildResult.durationMs / 1000).toFixed(1)}s
                    </span>
                  </div>
                  <ScrollArea className="max-h-64">
                    <pre className="whitespace-pre-wrap font-mono text-xs">
                      {buildResult.output || 'No output captured.'}
                    </pre>
                  </ScrollArea>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
