import { useEffect, useMemo, useState, type UIEvent } from 'react'
import { FileJson, FilePenLine, FolderOpen, Hammer, Image, Package } from 'lucide-react'
import { WarningBox } from '@/components/WarningBox'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useAppContext } from '@/context/AppContext'
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
  VanillaAssetEntry,
} from '@/shared/hymn-types'

const assetKindLabels: Record<ModAssetKind, string> = {
  texture: 'Texture',
  model: 'Model',
  animation: 'Animation',
  audio: 'Audio',
  other: 'Other',
}

const assetFilters: Array<{ value: 'all' | ModAssetKind; label: string }> = [
  { value: 'all', label: 'All assets' },
  { value: 'texture', label: 'Textures' },
  { value: 'model', label: 'Models' },
  { value: 'animation', label: 'Animations' },
  { value: 'audio', label: 'Audio' },
  { value: 'other', label: 'Other files' },
]

const serverAssetKindLabels: Record<ServerAssetKind, string> = {
  item: 'Item',
  block: 'Block',
  category: 'Category',
  other: 'Other',
}

const serverAssetTemplates: Array<{ value: ServerAssetTemplate; label: string; folder: string }> = [
  { value: 'item', label: 'Item template', folder: 'Server/Item/Items' },
  { value: 'block', label: 'Block template', folder: 'Server/Item/Blocks' },
  { value: 'category', label: 'Category template', folder: 'Server/Item/Category' },
  { value: 'empty', label: 'Empty JSON', folder: 'Server/Item/Items' },
]

const VANILLA_PAGE_SIZE = 200

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

const normalizeAnyFolderInput = (value: string) => {
  return value.replace(/\\/g, '/').replace(/\/+$/, '').trim()
}

const ensureJsonFileName = (name: string) => {
  const trimmed = name.trim()
  if (!trimmed) return ''
  return trimmed.toLowerCase().endsWith('.json') ? trimmed : `${trimmed}.json`
}

const stripJsonExtension = (name: string) => name.replace(/\.json$/i, '')

const getAssetFolder = (relativePath: string) => {
  const normalized = relativePath.replace(/\\/g, '/')
  const segments = normalized.split('/').slice(0, -1)
  return segments.length ? segments.join('/') : ''
}

const buildServerRelativePath = (folder: string, name: string) => {
  const normalizedFolder = normalizeFolderInput(folder)
  const fileName = ensureJsonFileName(name)
  if (!fileName) return ''
  return `${normalizedFolder}/${fileName}`.replace(/\/+/g, '/')
}

const buildAnyRelativePath = (folder: string, name: string) => {
  const normalizedFolder = normalizeAnyFolderInput(folder)
  const fileName = name.trim()
  if (!fileName) return ''
  const pathValue = normalizedFolder ? `${normalizedFolder}/${fileName}` : fileName
  return pathValue.replace(/\/+/g, '/')
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
  const { installInfo, isScanning, scanResult } = state

  const [packName, setPackName] = useState('')
  const [packGroup, setPackGroup] = useState('')
  const [packVersion, setPackVersion] = useState('1.0.0')
  const [packDescription, setPackDescription] = useState('')
  const [authorName, setAuthorName] = useState('')
  const [authorEmail, setAuthorEmail] = useState('')
  const [packLocation, setPackLocation] = useState<'packs' | 'mods'>('packs')
  const [includeCommon, setIncludeCommon] = useState(true)
  const [includeServer, setIncludeServer] = useState(true)
  const [isCreating, setIsCreating] = useState(false)
  const [createResult, setCreateResult] = useState<{ success: boolean; path?: string; error?: string } | null>(null)

  const [manifestJson, setManifestJson] = useState<string>(
    JSON.stringify(
      {
        Name: 'MyPack',
        Group: 'MyGroup',
        Version: '1.0.0',
        Description: 'A new Hytale pack',
        Authors: [{ Name: 'Author Name' }],
      } satisfies PackManifest,
      null,
      2,
    ),
  )
  const [manifestError, setManifestError] = useState<string | null>(null)
  const [manifestTargetPath, setManifestTargetPath] = useState('')
  const [manifestPath, setManifestPath] = useState<string | null>(null)
  const [manifestWarnings, setManifestWarnings] = useState<string[]>([])
  const [manifestLoadError, setManifestLoadError] = useState<string | null>(null)
  const [manifestStatus, setManifestStatus] = useState<string | null>(null)
  const [manifestReadOnly, setManifestReadOnly] = useState(false)
  const [isManifestLoading, setIsManifestLoading] = useState(false)
  const [isManifestSaving, setIsManifestSaving] = useState(false)

  const [assetTargetPath, setAssetTargetPath] = useState('')
  const [assetFilter, setAssetFilter] = useState<'all' | ModAssetKind>('all')
  const [assetItems, setAssetItems] = useState<ModAsset[]>([])
  const [assetWarnings, setAssetWarnings] = useState<string[]>([])
  const [assetError, setAssetError] = useState<string | null>(null)
  const [isAssetLoading, setIsAssetLoading] = useState(false)

  const [serverTargetPath, setServerTargetPath] = useState('')
  const [serverAssets, setServerAssets] = useState<ServerAsset[]>([])
  const [serverWarnings, setServerWarnings] = useState<string[]>([])
  const [serverError, setServerError] = useState<string | null>(null)
  const [serverFilter, setServerFilter] = useState('')
  const [selectedServerAssetId, setSelectedServerAssetId] = useState<string | null>(null)
  const [newServerAssetName, setNewServerAssetName] = useState('')
  const [newServerAssetFolder, setNewServerAssetFolder] = useState(serverAssetTemplates[0].folder)
  const [newServerAssetTemplate, setNewServerAssetTemplate] = useState<ServerAssetTemplate>('item')
  const [serverActionName, setServerActionName] = useState('')
  const [serverActionFolder, setServerActionFolder] = useState(serverAssetTemplates[0].folder)
  const [serverStatus, setServerStatus] = useState<string | null>(null)
  const [isServerLoading, setIsServerLoading] = useState(false)
  const [isServerMutating, setIsServerMutating] = useState(false)

  const [vanillaAssets, setVanillaAssets] = useState<VanillaAssetEntry[]>([])
  const [vanillaWarnings, setVanillaWarnings] = useState<string[]>([])
  const [vanillaError, setVanillaError] = useState<string | null>(null)
  const [vanillaFilterInput, setVanillaFilterInput] = useState('')
  const [vanillaFilter, setVanillaFilter] = useState('')
  const [selectedVanillaId, setSelectedVanillaId] = useState<string | null>(null)
  const [vanillaCopyFolder, setVanillaCopyFolder] = useState(serverAssetTemplates[0].folder)
  const [vanillaCopyName, setVanillaCopyName] = useState('')
  const [vanillaHasMore, setVanillaHasMore] = useState(false)
  const [vanillaNextOffset, setVanillaNextOffset] = useState(0)
  const [isVanillaLoading, setIsVanillaLoading] = useState(false)
  const [isVanillaLoadingMore, setIsVanillaLoadingMore] = useState(false)
  const [isVanillaCopying, setIsVanillaCopying] = useState(false)

  const [buildTargetPath, setBuildTargetPath] = useState('')
  const [buildTask, setBuildTask] = useState('build')
  const [buildResult, setBuildResult] = useState<ModBuildResult | null>(null)
  const [buildError, setBuildError] = useState<string | null>(null)
  const [isBuilding, setIsBuilding] = useState(false)

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

  const filteredVanillaAssets = useMemo(() => {
    if (!vanillaFilter.trim()) return vanillaAssets
    const lowered = vanillaFilter.toLowerCase()
    return vanillaAssets.filter((asset) => {
      return asset.name.toLowerCase().includes(lowered) || asset.relativePath.toLowerCase().includes(lowered)
    })
  }, [vanillaAssets, vanillaFilter])

  const selectedServerAsset = useMemo(() => {
    return serverAssets.find((asset) => asset.id === selectedServerAssetId) ?? null
  }, [serverAssets, selectedServerAssetId])

  const selectedVanillaAsset = useMemo(() => {
    return vanillaAssets.find((asset) => asset.id === selectedVanillaId) ?? null
  }, [selectedVanillaId, vanillaAssets])

  useEffect(() => {
    if (!selectedServerAsset) {
      setServerActionName('')
      return
    }
    setServerActionName(stripJsonExtension(selectedServerAsset.name))
    setServerActionFolder(getAssetFolder(selectedServerAsset.relativePath))
  }, [selectedServerAsset])

  useEffect(() => {
    const template = serverAssetTemplates.find((entry) => entry.value === newServerAssetTemplate)
    if (template) {
      setNewServerAssetFolder(template.folder)
    }
  }, [newServerAssetTemplate])

  useEffect(() => {
    if (!selectedVanillaAsset) {
      setVanillaCopyName('')
      return
    }
    setVanillaCopyName(selectedVanillaAsset.name)
    const parentFolder = getAssetFolder(selectedVanillaAsset.relativePath)
    setVanillaCopyFolder(parentFolder)
  }, [selectedVanillaAsset])

  useEffect(() => {
    const handle = setTimeout(() => {
      setVanillaFilter(vanillaFilterInput.trim())
    }, 400)
    return () => clearTimeout(handle)
  }, [vanillaFilterInput])

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
        authorEmail: authorEmail || undefined,
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
      setAuthorEmail('')

      await actions.runScan()
    } catch (error) {
      setCreateResult({ success: false, error: error instanceof Error ? error.message : 'Failed to create pack.' })
    } finally {
      setIsCreating(false)
    }
  }

  const handleOpenInExplorer = async () => {
    if (createResult?.path) {
      await window.hymn.openInExplorer(createResult.path)
    }
  }

  const validateManifest = () => {
    try {
      const parsed = JSON.parse(manifestJson) as PackManifest
      if (!parsed.Name || typeof parsed.Name !== 'string') {
        setManifestError('Name field is required and must be a string.')
        return
      }
      if (parsed.Version && typeof parsed.Version !== 'string') {
        setManifestError('Version must be a string.')
        return
      }
      if (parsed.Group && typeof parsed.Group !== 'string') {
        setManifestError('Group must be a string.')
        return
      }
      if (parsed.Authors && !Array.isArray(parsed.Authors)) {
        setManifestError('Authors must be an array.')
        return
      }
      if (parsed.Dependencies && !Array.isArray(parsed.Dependencies)) {
        setManifestError('Dependencies must be an array of strings.')
        return
      }
      setManifestError(null)
    } catch {
      setManifestError('Invalid JSON syntax.')
    }
  }

  const formatManifest = () => {
    try {
      const parsed = JSON.parse(manifestJson)
      setManifestJson(JSON.stringify(parsed, null, 2))
      setManifestError(null)
    } catch {
      setManifestError('Invalid JSON syntax.')
    }
  }

  const copyManifest = async () => {
    await navigator.clipboard.writeText(manifestJson)
  }

  const handleLoadManifest = async () => {
    if (!manifestEntry) {
      setManifestLoadError('Select a mod to load its manifest.')
      return
    }

    setIsManifestLoading(true)
    setManifestLoadError(null)
    setManifestStatus(null)

    try {
      const result = await window.hymn.getModManifest({
        path: manifestEntry.path,
        format: manifestEntry.format,
      })
      setManifestPath(result.manifestPath)
      setManifestWarnings(result.warnings)
      setManifestReadOnly(result.readOnly)
      setManifestJson(result.content ?? buildManifestTemplate(manifestEntry))
      setManifestError(null)
    } catch (error) {
      setManifestLoadError(error instanceof Error ? error.message : 'Unable to load manifest.')
    } finally {
      setIsManifestLoading(false)
    }
  }

  const handleSaveManifest = async () => {
    if (!manifestEntry) {
      setManifestLoadError('Select a mod to save the manifest.')
      return
    }
    if (manifestReadOnly) {
      setManifestLoadError('Selected mod is read-only (archive).')
      return
    }
    try {
      JSON.parse(manifestJson)
    } catch {
      setManifestError('Invalid JSON syntax.')
      return
    }

    setIsManifestSaving(true)
    setManifestLoadError(null)
    setManifestStatus(null)

    try {
      const result = await window.hymn.saveModManifest({
        path: manifestEntry.path,
        format: manifestEntry.format,
        content: manifestJson,
      })
      setManifestStatus('Manifest saved successfully.')
      setManifestWarnings(result.warnings)
      await actions.runScan()
    } catch (error) {
      setManifestLoadError(error instanceof Error ? error.message : 'Unable to save manifest.')
    } finally {
      setIsManifestSaving(false)
    }
  }

  const handleOpenManifestFolder = async () => {
    if (manifestEntry) {
      await window.hymn.openInExplorer(manifestEntry.path)
    }
  }

  const handleLoadAssets = async () => {
    if (!assetEntry) {
      setAssetError('Select a mod to load assets.')
      return
    }

    setIsAssetLoading(true)
    setAssetError(null)
    setAssetWarnings([])

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
      setAssetWarnings(result.warnings)
      setAssetFilter('all')
    } catch (error) {
      setAssetError(error instanceof Error ? error.message : 'Unable to load asset previews.')
    } finally {
      setIsAssetLoading(false)
    }
  }

  const handleOpenAssetFolder = async () => {
    if (assetEntry) {
      await window.hymn.openInExplorer(assetEntry.path)
    }
  }

  const upsertServerAsset = (asset: ServerAsset, removedId?: string) => {
    setServerAssets((prev) => {
      const filtered = prev.filter((item) => item.id !== asset.id && item.id !== removedId)
      const next = [...filtered, asset]
      next.sort((a, b) => a.relativePath.localeCompare(b.relativePath))
      return next
    })
  }

  const handleLoadServerAssets = async () => {
    if (!serverEntry) {
      setServerError('Select a directory mod to manage server assets.')
      return
    }

    setIsServerLoading(true)
    setServerError(null)
    setServerStatus(null)

    try {
      const result = await window.hymn.listServerAssets({
        path: serverEntry.path,
        maxAssets: 320,
      })
      setServerAssets(result.assets)
      setServerWarnings(result.warnings)
      setSelectedServerAssetId(null)
    } catch (error) {
      setServerError(error instanceof Error ? error.message : 'Unable to load server assets.')
    } finally {
      setIsServerLoading(false)
    }
  }

  const handleCreateServerAsset = async () => {
    if (!serverEntry) {
      setServerError('Select a directory mod to create assets.')
      return
    }

    const destinationRelative = normalizeFolderInput(newServerAssetFolder)
    const assetName = ensureJsonFileName(newServerAssetName)
    if (!assetName) {
      setServerError('Asset name is required.')
      return
    }

    setIsServerMutating(true)
    setServerError(null)
    setServerStatus(null)

    try {
      const result = await window.hymn.createServerAsset({
        path: serverEntry.path,
        destination: destinationRelative,
        name: assetName,
        template: newServerAssetTemplate,
      })
      upsertServerAsset(result.asset)
      setServerStatus('Server asset created.')
      setNewServerAssetName('')
    } catch (error) {
      setServerError(error instanceof Error ? error.message : 'Unable to create server asset.')
    } finally {
      setIsServerMutating(false)
    }
  }

  const handleDuplicateServerAsset = async () => {
    if (!serverEntry || !selectedServerAsset) {
      setServerError('Select a server asset to duplicate.')
      return
    }

    const targetPath = buildServerRelativePath(serverActionFolder, serverActionName)
    if (!targetPath) {
      setServerError('Destination folder and name are required.')
      return
    }

    setIsServerMutating(true)
    setServerError(null)
    setServerStatus(null)

    try {
      const result = await window.hymn.duplicateServerAsset({
        path: serverEntry.path,
        source: selectedServerAsset.relativePath,
        destination: targetPath,
      })
      upsertServerAsset(result.asset)
      setServerStatus('Server asset duplicated.')
    } catch (error) {
      setServerError(error instanceof Error ? error.message : 'Unable to duplicate asset.')
    } finally {
      setIsServerMutating(false)
    }
  }

  const handleMoveServerAsset = async () => {
    if (!serverEntry || !selectedServerAsset) {
      setServerError('Select a server asset to move or rename.')
      return
    }

    const targetPath = buildServerRelativePath(serverActionFolder, serverActionName)
    if (!targetPath) {
      setServerError('Destination folder and name are required.')
      return
    }

    setIsServerMutating(true)
    setServerError(null)
    setServerStatus(null)

    try {
      const result = await window.hymn.moveServerAsset({
        path: serverEntry.path,
        source: selectedServerAsset.relativePath,
        destination: targetPath,
      })
      upsertServerAsset(result.asset, selectedServerAsset.id)
      setSelectedServerAssetId(result.asset.id)
      setServerStatus('Server asset moved.')
    } catch (error) {
      setServerError(error instanceof Error ? error.message : 'Unable to move asset.')
    } finally {
      setIsServerMutating(false)
    }
  }

  const handleDeleteServerAsset = async () => {
    if (!serverEntry || !selectedServerAsset) {
      setServerError('Select a server asset to delete.')
      return
    }

    setIsServerMutating(true)
    setServerError(null)
    setServerStatus(null)

    try {
      await window.hymn.deleteServerAsset({
        path: serverEntry.path,
        relativePath: selectedServerAsset.relativePath,
      })
      setServerAssets((prev) => prev.filter((asset) => asset.id !== selectedServerAsset.id))
      setSelectedServerAssetId(null)
      setServerStatus('Server asset deleted.')
    } catch (error) {
      setServerError(error instanceof Error ? error.message : 'Unable to delete asset.')
    } finally {
      setIsServerMutating(false)
    }
  }

  const handleOpenServerAsset = async () => {
    if (selectedServerAsset) {
      await window.hymn.openInExplorer(selectedServerAsset.absolutePath)
    }
  }

  const handleOpenServerFolder = async () => {
    if (serverEntry) {
      await window.hymn.openInExplorer(serverEntry.path)
    }
  }

  const fetchVanillaAssets = async (offset: number, append: boolean) => {
    if (append) {
      setIsVanillaLoadingMore(true)
    } else {
      setIsVanillaLoading(true)
    }
    setVanillaError(null)

    try {
      const result = await window.hymn.listVanillaAssets({
        maxAssets: 100000,
        maxRoots: 6,
        offset,
        limit: VANILLA_PAGE_SIZE,
      })
      setVanillaAssets((prev) => (append ? [...prev, ...result.assets] : result.assets))
      setVanillaWarnings(result.warnings)
      setVanillaHasMore(result.hasMore)
      setVanillaNextOffset(result.nextOffset)
      if (!append) {
        setSelectedVanillaId(null)
      }
    } catch (error) {
      setVanillaError(error instanceof Error ? error.message : 'Unable to scan vanilla assets.')
    } finally {
      setIsVanillaLoading(false)
      setIsVanillaLoadingMore(false)
    }
  }

  const handleLoadVanillaAssets = async () => {
    await fetchVanillaAssets(0, false)
  }

  const handleLoadMoreVanillaAssets = async () => {
    if (!vanillaHasMore || isVanillaLoadingMore) return
    await fetchVanillaAssets(vanillaNextOffset, true)
  }

  const handleVanillaScroll = (event: UIEvent<HTMLDivElement>) => {
    const target = event.currentTarget
    if (target.scrollTop + target.clientHeight >= target.scrollHeight - 48) {
      void handleLoadMoreVanillaAssets()
    }
  }

  useEffect(() => {
    const query = vanillaFilter.trim()
    if (!query) return
    if (isVanillaLoading || isVanillaLoadingMore) return
    if (vanillaAssets.length === 0) {
      void handleLoadVanillaAssets()
      return
    }
    if (filteredVanillaAssets.length === 0 && vanillaHasMore) {
      void handleLoadMoreVanillaAssets()
    }
  }, [
    vanillaFilter,
    vanillaAssets.length,
    filteredVanillaAssets.length,
    vanillaHasMore,
    isVanillaLoading,
    isVanillaLoadingMore,
    handleLoadVanillaAssets,
    handleLoadMoreVanillaAssets,
  ])

  const handleImportVanillaAsset = async () => {
    if (!serverEntry || !selectedVanillaAsset) {
      setVanillaError('Select a vanilla asset and a destination mod.')
      return
    }

    const targetPath = buildAnyRelativePath(vanillaCopyFolder, vanillaCopyName)
    if (!targetPath) {
      setVanillaError('Destination folder and name are required.')
      return
    }

    setIsVanillaCopying(true)
    setVanillaError(null)

    try {
      const result = await window.hymn.importVanillaAsset({
        sourceType: selectedVanillaAsset.sourceType,
        sourcePath: selectedVanillaAsset.sourcePath,
        archivePath: selectedVanillaAsset.archivePath,
        entryPath: selectedVanillaAsset.entryPath,
        destinationPath: serverEntry.path,
        destinationRelativePath: targetPath,
      })
      if (
        result.asset.relativePath.toLowerCase().startsWith('server/') &&
        result.asset.name.toLowerCase().endsWith('.json')
      ) {
        upsertServerAsset(result.asset)
      }
      setServerStatus('Vanilla asset copied into pack.')
    } catch (error) {
      setVanillaError(error instanceof Error ? error.message : 'Unable to copy vanilla asset.')
    } finally {
      setIsVanillaCopying(false)
    }
  }

  const handleOpenVanillaAsset = async () => {
    if (selectedVanillaAsset) {
      const targetPath = selectedVanillaAsset.archivePath ?? selectedVanillaAsset.sourcePath
      if (targetPath) {
        await window.hymn.openInExplorer(targetPath)
      }
    }
  }

  const handleRunBuild = async () => {
    if (!buildEntry) {
      setBuildError('Select a workspace to build.')
      return
    }

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

  const handleOpenBuildFolder = async () => {
    if (buildEntry) {
      await window.hymn.openInExplorer(buildEntry.path)
    }
  }

  const hasInstall = !!installInfo?.activePath

  return (
    <>
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold">Create</h1>
        <p className="text-sm text-muted-foreground">
          Scaffold packs, edit manifests, preview assets, and build plugins.
        </p>
      </header>

      <Tabs defaultValue="pack" className="space-y-4">
        <TabsList className="w-fit flex-wrap">
          <TabsTrigger value="pack">Pack Wizard</TabsTrigger>
          <TabsTrigger value="manifest">Manifest Editor</TabsTrigger>
          <TabsTrigger value="assets">Asset Previews</TabsTrigger>
          <TabsTrigger value="server">Server Assets</TabsTrigger>
          <TabsTrigger value="build">Mod Build</TabsTrigger>
        </TabsList>

        <TabsContent value="pack">
          <Card>
            <CardHeader className="flex flex-row items-center gap-3">
              <Package className="h-5 w-5 text-muted-foreground" />
              <CardTitle className="text-base">Pack Wizard</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Generate folder structure and manifest for a new pack.
              </p>

              {!hasInstall ? (
                <Badge variant="destructive">Configure install path first</Badge>
              ) : (
                <>
                  <div className="grid gap-3">
                    <div className="space-y-2">
                      <Label htmlFor="pack-name">Pack Name *</Label>
                      <Input
                        id="pack-name"
                        value={packName}
                        onChange={(e) => setPackName(e.target.value)}
                        placeholder="MyAwesomePack"
                      />
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="pack-group">Group</Label>
                        <Input
                          id="pack-group"
                          value={packGroup}
                          onChange={(e) => setPackGroup(e.target.value)}
                          placeholder="com.example"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="pack-version">Version</Label>
                        <Input
                          id="pack-version"
                          value={packVersion}
                          onChange={(e) => setPackVersion(e.target.value)}
                          placeholder="1.0.0"
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

                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="author-name">Author Name</Label>
                        <Input
                          id="author-name"
                          value={authorName}
                          onChange={(e) => setAuthorName(e.target.value)}
                          placeholder="Your name"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="author-email">Author Email</Label>
                        <Input
                          id="author-email"
                          type="email"
                          value={authorEmail}
                          onChange={(e) => setAuthorEmail(e.target.value)}
                          placeholder="you@example.com"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="pack-location">Location</Label>
                      <Select value={packLocation} onValueChange={(v) => setPackLocation(v as 'packs' | 'mods')}>
                        <SelectTrigger id="pack-location">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="packs">UserData/Packs (data packs)</SelectItem>
                          <SelectItem value="mods">UserData/Mods (plugins & mods)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <Separator />

                    <div className="space-y-3">
                      <Label>Folder Structure</Label>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="include-common"
                          checked={includeCommon}
                          onCheckedChange={(checked) => setIncludeCommon(checked === true)}
                        />
                        <Label htmlFor="include-common" className="text-sm font-normal">
                          Include Common folder (textures, models)
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="include-server"
                          checked={includeServer}
                          onCheckedChange={(checked) => setIncludeServer(checked === true)}
                        />
                        <Label htmlFor="include-server" className="text-sm font-normal">
                          Include Server folder (items, blocks, languages)
                        </Label>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Button onClick={handleCreatePack} disabled={isCreating || isScanning || !packName.trim()}>
                      {isCreating ? 'Creating…' : 'Create Pack'}
                    </Button>
                  </div>

                  {createResult && (
                    <div className="space-y-2">
                      {createResult.success ? (
                        <>
                          <Badge variant="secondary">Pack created successfully</Badge>
                          <p className="text-xs text-muted-foreground font-mono break-all">
                            {createResult.path}
                          </p>
                          <Button variant="outline" size="sm" onClick={handleOpenInExplorer}>
                            <FolderOpen className="mr-2 h-4 w-4" />
                            Open in Explorer
                          </Button>
                        </>
                      ) : (
                        <Badge variant="destructive">{createResult.error}</Badge>
                      )}
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="manifest">
          <div className="grid gap-4 lg:grid-cols-[1fr_1.2fr]">
            <Card>
              <CardHeader className="flex flex-row items-center gap-3">
                <FilePenLine className="h-5 w-5 text-muted-foreground" />
                <CardTitle className="text-base">Manifest Workspace</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Load an existing pack or plugin manifest for quick edits.
                </p>

                <div className="space-y-2">
                  <Label htmlFor="manifest-target">Target Mod</Label>
                  <Select
                    value={manifestTargetPath}
                    onValueChange={(value) => {
                      setManifestTargetPath(value)
                      setManifestPath(null)
                      setManifestWarnings([])
                      setManifestLoadError(null)
                      setManifestStatus(null)
                      setManifestReadOnly(false)
                    }}
                  >
                    <SelectTrigger id="manifest-target">
                      <SelectValue placeholder="Select a mod to edit" />
                    </SelectTrigger>
                    <SelectContent>
                      {modEntries.length === 0 ? (
                        <SelectItem value="none" disabled>
                          No mods detected
                        </SelectItem>
                      ) : (
                        modEntries.map((entry) => (
                          <SelectItem key={entry.path} value={entry.path}>
                            {entry.name} ({entry.format})
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>

                {manifestEntry && (
                  <div className="rounded-lg border border-border/60 bg-muted/20 p-3 text-xs text-muted-foreground">
                    <p className="font-medium text-foreground">{manifestEntry.name}</p>
                    <p>Location: {manifestEntry.location}</p>
                    <p>Type: {manifestEntry.type}</p>
                    <p>Format: {manifestEntry.format}</p>
                  </div>
                )}

                <div className="flex flex-wrap gap-2">
                  <Button
                    onClick={handleLoadManifest}
                    disabled={!manifestEntry || isManifestLoading}
                  >
                    {isManifestLoading ? 'Loading…' : 'Load Manifest'}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleOpenManifestFolder}
                    disabled={!manifestEntry}
                  >
                    <FolderOpen className="mr-2 h-4 w-4" />
                    Open in Explorer
                  </Button>
                </div>

                {manifestPath && (
                  <p className="text-xs text-muted-foreground font-mono break-all">
                    {manifestPath}
                  </p>
                )}

                {manifestReadOnly && <Badge variant="outline">Read-only archive</Badge>}

                {manifestStatus && <Badge variant="secondary">{manifestStatus}</Badge>}

                {manifestLoadError && <Badge variant="destructive">{manifestLoadError}</Badge>}

                <WarningBox title="Manifest notes" warnings={manifestWarnings} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center gap-3">
                <FileJson className="h-5 w-5 text-muted-foreground" />
                <CardTitle className="text-base">Manifest Editor</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Validate and update manifest.json for Hytale packs and plugins.
                </p>

                <div className="space-y-2">
                  <Label htmlFor="manifest-editor">manifest.json</Label>
                  <Textarea
                    id="manifest-editor"
                    value={manifestJson}
                    onChange={(e) => {
                      setManifestJson(e.target.value)
                      setManifestError(null)
                      setManifestStatus(null)
                    }}
                    className="font-mono text-xs min-h-[260px]"
                    placeholder='{"Name": "MyPack", ...}'
                  />
                </div>

                {manifestError && (
                  <Badge variant="destructive">{manifestError}</Badge>
                )}

                <div className="flex flex-wrap gap-2">
                  <Button variant="secondary" size="sm" onClick={validateManifest}>
                    Validate
                  </Button>
                  <Button variant="outline" size="sm" onClick={formatManifest}>
                    Format JSON
                  </Button>
                  <Button variant="outline" size="sm" onClick={copyManifest}>
                    Copy to Clipboard
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleSaveManifest}
                    disabled={!manifestEntry || isManifestSaving || manifestReadOnly}
                  >
                    {isManifestSaving ? 'Saving…' : 'Save Manifest'}
                  </Button>
                </div>

                <Separator />

                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground">Required Fields</p>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li><code className="bg-muted px-1 rounded">Name</code> - Pack/plugin name (string)</li>
                  </ul>
                  <p className="text-xs font-medium text-muted-foreground mt-3">Common Fields</p>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li><code className="bg-muted px-1 rounded">Group</code> - Namespace (e.g., "com.example")</li>
                    <li><code className="bg-muted px-1 rounded">Version</code> - Semantic version (e.g., "1.0.0")</li>
                    <li><code className="bg-muted px-1 rounded">Description</code> - Brief description</li>
                    <li><code className="bg-muted px-1 rounded">Authors</code> - Array of {'{Name, Email?, Url?}'}</li>
                    <li><code className="bg-muted px-1 rounded">Main</code> - Plugin entry point class (plugins only)</li>
                    <li><code className="bg-muted px-1 rounded">Dependencies</code> - Required mods array</li>
                    <li><code className="bg-muted px-1 rounded">IncludesAssetPack</code> - Has Common/ assets (boolean)</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="assets">
          <Card>
            <CardHeader className="flex flex-row items-center gap-3">
              <Image className="h-5 w-5 text-muted-foreground" />
              <CardTitle className="text-base">Asset Previews</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Preview textures, models, animations, and audio bundled in packs.
              </p>

              <div className="grid gap-3 sm:grid-cols-[2fr_1fr]">
                <div className="space-y-2">
                  <Label htmlFor="asset-target">Asset Source</Label>
                  <Select
                    value={assetTargetPath}
                    onValueChange={(value) => {
                      setAssetTargetPath(value)
                      setAssetItems([])
                      setAssetWarnings([])
                      setAssetError(null)
                    }}
                  >
                    <SelectTrigger id="asset-target">
                      <SelectValue placeholder="Select a pack or plugin" />
                    </SelectTrigger>
                    <SelectContent>
                      {modEntries.length === 0 ? (
                        <SelectItem value="none" disabled>
                          No mods detected
                        </SelectItem>
                      ) : (
                        modEntries.map((entry) => (
                          <SelectItem key={entry.path} value={entry.path}>
                            {entry.name}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="asset-filter">Filter</Label>
                  <Select value={assetFilter} onValueChange={(value) => setAssetFilter(value as 'all' | ModAssetKind)}>
                    <SelectTrigger id="asset-filter">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {assetFilters.map((filter) => (
                        <SelectItem key={filter.value} value={filter.value}>
                          {filter.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button onClick={handleLoadAssets} disabled={!assetEntry || isAssetLoading}>
                  {isAssetLoading ? 'Loading…' : 'Load Assets'}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleOpenAssetFolder}
                  disabled={!assetEntry}
                >
                  <FolderOpen className="mr-2 h-4 w-4" />
                  Open in Explorer
                </Button>
              </div>

              {assetError && <Badge variant="destructive">{assetError}</Badge>}

              <WarningBox title="Asset warnings" warnings={assetWarnings} />

              <Separator />

              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>
                  Showing {filteredAssets.length} of {assetItems.length} assets
                </span>
                {assetEntry && (
                  <span>{assetEntry.format.toUpperCase()} preview</span>
                )}
              </div>

              {assetItems.length === 0 ? (
                <div className="rounded-lg border border-dashed border-border/60 p-6 text-center text-sm text-muted-foreground">
                  Load a mod to see asset previews.
                </div>
              ) : (
                <ScrollArea className="max-h-[420px]">
                  <div className="grid gap-3 pr-3 sm:grid-cols-2 lg:grid-cols-3">
                    {filteredAssets.map((asset) => (
                      <div
                        key={asset.id}
                        className="rounded-lg border border-border/60 bg-muted/20 p-3"
                      >
                        <div className="flex h-28 items-center justify-center rounded-md bg-black/20">
                          {asset.previewDataUrl ? (
                            <img
                              src={asset.previewDataUrl}
                              alt={asset.name}
                              className="h-full w-full rounded-md object-contain"
                            />
                          ) : (
                            <span className="text-xs text-muted-foreground">No preview</span>
                          )}
                        </div>
                        <div className="mt-2 space-y-1">
                          <p className="truncate text-xs font-medium text-foreground">{asset.name}</p>
                          <p className="truncate text-[11px] text-muted-foreground">{asset.relativePath}</p>
                          <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                            <span>{assetKindLabels[asset.kind]}</span>
                            <span>{formatBytes(asset.size)}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="server">
          <div className="grid gap-4 lg:grid-cols-[1.2fr_0.9fr]">
            <Card>
              <CardHeader className="flex flex-row items-center gap-3">
                <FileJson className="h-5 w-5 text-muted-foreground" />
                <CardTitle className="text-base">Server Assets</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Create and organize Server JSON assets directly inside packs.
                </p>

                <div className="space-y-2">
                  <Label htmlFor="server-target">Destination Mod</Label>
                  <Select
                    value={serverTargetPath}
                    onValueChange={(value) => {
                      setServerTargetPath(value)
                      setServerAssets([])
                      setServerWarnings([])
                      setServerError(null)
                      setServerStatus(null)
                      setSelectedServerAssetId(null)
                    }}
                  >
                    <SelectTrigger id="server-target">
                      <SelectValue placeholder="Select a directory mod" />
                    </SelectTrigger>
                    <SelectContent>
                      {directoryEntries.length === 0 ? (
                        <SelectItem value="none" disabled>
                          No directory mods detected
                        </SelectItem>
                      ) : (
                        directoryEntries.map((entry) => (
                          <SelectItem key={entry.path} value={entry.path}>
                            {entry.name}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>

                {serverEntry && (
                  <div className="rounded-lg border border-border/60 bg-muted/20 p-3 text-xs text-muted-foreground">
                    <p className="font-medium text-foreground">{serverEntry.name}</p>
                    <p>Path: {serverEntry.path}</p>
                  </div>
                )}

                <div className="flex flex-wrap gap-2">
                  <Button onClick={handleLoadServerAssets} disabled={!serverEntry || isServerLoading}>
                    {isServerLoading ? 'Loading…' : 'Load Server Assets'}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleOpenServerFolder}
                    disabled={!serverEntry}
                  >
                    <FolderOpen className="mr-2 h-4 w-4" />
                    Open Mod Folder
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleOpenServerAsset}
                    disabled={!selectedServerAsset}
                  >
                    <FolderOpen className="mr-2 h-4 w-4" />
                    Open Selected
                  </Button>
                </div>

                {serverStatus && <Badge variant="secondary">{serverStatus}</Badge>}
                {serverError && <Badge variant="destructive">{serverError}</Badge>}

                <WarningBox title="Server asset warnings" warnings={serverWarnings} />

                <Separator />

                <div className="space-y-3">
                  <p className="text-xs font-medium text-muted-foreground">Create New Asset</p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="server-template">Template</Label>
                      <Select
                        value={newServerAssetTemplate}
                        onValueChange={(value) => setNewServerAssetTemplate(value as ServerAssetTemplate)}
                      >
                        <SelectTrigger id="server-template">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {serverAssetTemplates.map((template) => (
                            <SelectItem key={template.value} value={template.value}>
                              {template.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="server-name">Asset Name</Label>
                      <Input
                        id="server-name"
                        value={newServerAssetName}
                        onChange={(event) => setNewServerAssetName(event.target.value)}
                        placeholder="Example_Item.json"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="server-folder">Destination Folder</Label>
                    <Input
                      id="server-folder"
                      value={newServerAssetFolder}
                      onChange={(event) => setNewServerAssetFolder(event.target.value)}
                      placeholder="Server/Item/Items"
                    />
                    <p className="text-xs text-muted-foreground">Defaults to the selected pack folder.</p>
                  </div>
                  <Button
                    size="sm"
                    onClick={handleCreateServerAsset}
                    disabled={!serverEntry || isServerMutating}
                  >
                    {isServerMutating ? 'Working…' : 'Create Asset'}
                  </Button>
                </div>

                <Separator />

                <div className="space-y-2">
                  <Label htmlFor="server-filter">Filter Assets</Label>
                  <Input
                    id="server-filter"
                    value={serverFilter}
                    onChange={(event) => setServerFilter(event.target.value)}
                    placeholder="Search by name or path"
                  />
                </div>

                <div className="overflow-hidden rounded-lg border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Kind</TableHead>
                        <TableHead>Path</TableHead>
                        <TableHead>Size</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredServerAssets.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={4} className="py-6 text-center text-xs text-muted-foreground">
                            {serverEntry ? 'No server assets found.' : 'Select a mod to list assets.'}
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredServerAssets.map((asset) => (
                          <TableRow
                            key={asset.id}
                            className={asset.id === selectedServerAssetId ? 'bg-muted/40' : undefined}
                            onClick={() => setSelectedServerAssetId(asset.id)}
                          >
                            <TableCell className="font-medium">{asset.name}</TableCell>
                            <TableCell>{serverAssetKindLabels[asset.kind]}</TableCell>
                            <TableCell className="text-xs text-muted-foreground">{asset.relativePath}</TableCell>
                            <TableCell className="text-xs text-muted-foreground">{formatBytes(asset.size)}</TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>

                <div className="rounded-lg border border-border/60 bg-muted/20 p-3 text-xs text-muted-foreground">
                  <p className="font-medium text-foreground">Selected Asset</p>
                  {selectedServerAsset ? (
                    <div className="mt-2 space-y-2">
                      <p>{selectedServerAsset.relativePath}</p>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="space-y-2">
                          <Label htmlFor="server-action-folder">Target Folder</Label>
                          <Input
                            id="server-action-folder"
                            value={serverActionFolder}
                            onChange={(event) => setServerActionFolder(event.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="server-action-name">Target Name</Label>
                          <Input
                            id="server-action-name"
                            value={serverActionName}
                            onChange={(event) => setServerActionName(event.target.value)}
                          />
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={handleDuplicateServerAsset}
                          disabled={isServerMutating}
                        >
                          Duplicate
                        </Button>
                        <Button size="sm" onClick={handleMoveServerAsset} disabled={isServerMutating}>
                          Move/Rename
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={handleDeleteServerAsset}
                          disabled={isServerMutating}
                        >
                          Delete
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <p className="mt-2">Select an asset to manage it.</p>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center gap-3">
                <Image className="h-5 w-5 text-muted-foreground" />
                <CardTitle className="text-base">Vanilla Assets</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Pull starter assets from the Hytale install and copy into your pack.
                </p>

                <div className="flex flex-wrap gap-2">
                  <Button onClick={handleLoadVanillaAssets} disabled={isVanillaLoading}>
                    {isVanillaLoading ? 'Scanning…' : 'Scan Vanilla Assets'}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleOpenVanillaAsset}
                    disabled={!selectedVanillaAsset}
                  >
                    <FolderOpen className="mr-2 h-4 w-4" />
                    Open Selected
                  </Button>
                </div>

                {vanillaError && <Badge variant="destructive">{vanillaError}</Badge>}

                <WarningBox title="Vanilla scan warnings" warnings={vanillaWarnings} />

                <div className="space-y-2">
                    <Label htmlFor="vanilla-filter">Filter Vanilla Assets</Label>
                    <Input
                      id="vanilla-filter"
                      value={vanillaFilterInput}
                      onChange={(event) => setVanillaFilterInput(event.target.value)}
                      placeholder="Search by name or path"
                    />

                </div>

                <div
                  className="max-h-[320px] overflow-auto rounded-lg border"
                  onScroll={handleVanillaScroll}
                >
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Path</TableHead>
                        <TableHead>Size</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredVanillaAssets.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={3} className="py-6 text-center text-xs text-muted-foreground">
                            Scan the install to list vanilla assets.
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredVanillaAssets.map((asset) => (
                          <TableRow
                            key={asset.id}
                            className={asset.id === selectedVanillaId ? 'bg-muted/40' : undefined}
                            onClick={() => setSelectedVanillaId(asset.id)}
                          >
                            <TableCell className="font-medium">{asset.name}</TableCell>
                            <TableCell className="text-xs text-muted-foreground">{asset.relativePath}</TableCell>
                            <TableCell className="text-xs text-muted-foreground">{formatBytes(asset.size)}</TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>

                {vanillaHasMore && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleLoadMoreVanillaAssets}
                    disabled={isVanillaLoadingMore}
                  >
                    {isVanillaLoadingMore ? 'Loading more…' : 'Load more assets'}
                  </Button>
                )}

                <Separator />

                <div className="space-y-3">
                  <p className="text-xs font-medium text-muted-foreground">Copy Into Pack</p>
                  <div className="space-y-2">
                    <Label htmlFor="vanilla-folder">Destination Folder</Label>
                    <Input
                      id="vanilla-folder"
                      value={vanillaCopyFolder}
                      onChange={(event) => setVanillaCopyFolder(event.target.value)}
                      placeholder="Common/BlockTextures"
                    />
                    <p className="text-xs text-muted-foreground">Use Server/ or Common/ paths.</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="vanilla-name">Destination Name</Label>
                    <Input
                      id="vanilla-name"
                      value={vanillaCopyName}
                      onChange={(event) => setVanillaCopyName(event.target.value)}
                      placeholder="Copied_Asset.png"
                    />
                  </div>
                  <Button
                    size="sm"
                    onClick={handleImportVanillaAsset}
                    disabled={!selectedVanillaAsset || !serverEntry || isVanillaCopying}
                  >
                    {isVanillaCopying ? 'Copying…' : 'Copy Into Pack'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="build">
          <Card>
            <CardHeader className="flex flex-row items-center gap-3">
              <Hammer className="h-5 w-5 text-muted-foreground" />
              <CardTitle className="text-base">Mod Build</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Run Gradle tasks for plugin workspaces with a bundled wrapper.
              </p>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="build-target">Workspace</Label>
                  <Select
                    value={buildTargetPath}
                    onValueChange={(value) => {
                      setBuildTargetPath(value)
                      setBuildResult(null)
                      setBuildError(null)
                    }}
                  >
                    <SelectTrigger id="build-target">
                      <SelectValue placeholder="Select a directory mod" />
                    </SelectTrigger>
                    <SelectContent>
                      {directoryEntries.length === 0 ? (
                        <SelectItem value="none" disabled>
                          No directory mods detected
                        </SelectItem>
                      ) : (
                        directoryEntries.map((entry) => (
                          <SelectItem key={entry.path} value={entry.path}>
                            {entry.name}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="build-task">Gradle Task</Label>
                  <Input
                    id="build-task"
                    value={buildTask}
                    onChange={(event) => setBuildTask(event.target.value)}
                    placeholder="build"
                  />
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button onClick={handleRunBuild} disabled={!buildEntry || isBuilding}>
                  {isBuilding ? 'Building…' : 'Run Build'}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleOpenBuildFolder}
                  disabled={!buildEntry}
                >
                  <FolderOpen className="mr-2 h-4 w-4" />
                  Open in Explorer
                </Button>
              </div>

              {buildError && <Badge variant="destructive">{buildError}</Badge>}

              {buildResult && (
                <div className="rounded-lg border border-border/60 bg-muted/20 p-3 text-xs text-muted-foreground">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={buildResult.success ? 'secondary' : 'destructive'}>
                      {buildResult.success ? 'Build succeeded' : 'Build failed'}
                    </Badge>
                    <span>{(buildResult.durationMs / 1000).toFixed(1)}s</span>
                    {buildResult.truncated && <span>Output truncated</span>}
                  </div>
                  <Separator className="my-2" />
                  <ScrollArea className="max-h-56 pr-3">
                    <pre className="whitespace-pre-wrap font-mono text-[11px]">
                      {buildResult.output || 'No output captured.'}
                    </pre>
                  </ScrollArea>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </>
  )
}
