import { useState } from 'react'
import { FolderOpen, Package, FileJson } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useAppContext } from '@/context/AppContext'
import type { CreatePackOptions, PackManifest } from '@/shared/hymn-types'

export function CreateSection() {
  const { state, actions } = useAppContext()
  const { installInfo, isScanning } = state

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

  const hasInstall = !!installInfo?.activePath

  return (
    <>
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold">Create</h1>
        <p className="text-sm text-muted-foreground">
          Scaffold packs, plugins, and manifests without touching folders manually.
        </p>
      </header>

      <div className="grid gap-4 lg:grid-cols-2">
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

        <Card>
          <CardHeader className="flex flex-row items-center gap-3">
            <FileJson className="h-5 w-5 text-muted-foreground" />
            <CardTitle className="text-base">Manifest Editor</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Validate and preview manifest.json for Hytale packs and plugins.
            </p>

            <div className="space-y-2">
              <Label htmlFor="manifest-editor">manifest.json</Label>
              <Textarea
                id="manifest-editor"
                value={manifestJson}
                onChange={(e) => {
                  setManifestJson(e.target.value)
                  setManifestError(null)
                }}
                className="font-mono text-xs min-h-[200px]"
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
    </>
  )
}
