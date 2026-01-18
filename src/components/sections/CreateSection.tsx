import { useEffect, useState, useCallback } from 'react'
import {
  Package,
  Plus,
  Code,
  Layers,
  RefreshCw,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAppContext } from '@/context/AppContext'
import type { ProjectEntry } from '@/shared/hymn-types'
import { ProjectCard } from '@/components/create/ProjectCard'
import { ModWorkspace } from '@/components/create/ModWorkspace'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'

type ProjectType = 'pack' | 'plugin'

export function CreateSection() {
  const { state } = useAppContext()
  const { installInfo } = state

  const [activeProject, setActiveProject] = useState<ProjectEntry | null>(null)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [projectType, setProjectType] = useState<ProjectType>('pack')

  // Projects list state
  const [projects, setProjects] = useState<ProjectEntry[]>([])
  const [isLoadingProjects, setIsLoadingProjects] = useState(false)

  // Common Creation State
  const [packName, setPackName] = useState('')
  const [packGroup, setPackGroup] = useState('')
  const [packVersion, setPackVersion] = useState('1.0.0')
  const [packDescription, setPackDescription] = useState('')
  const [authorName, setAuthorName] = useState('')
  const [isCreating, setIsCreating] = useState(false)

  // Pack-specific state
  const [packLocation, setPackLocation] = useState<'packs' | 'mods'>('packs')
  const [includeCommon, setIncludeCommon] = useState(true)
  const [includeServer, setIncludeServer] = useState(true)

  // Plugin-specific state
  const [includesAssetPack, setIncludesAssetPack] = useState(true)
  const [patchline, setPatchline] = useState<'release' | 'pre-release'>('release')

  const loadProjects = useCallback(async () => {
    setIsLoadingProjects(true)
    try {
      const result = await window.hymn.listProjects()
      setProjects(result.projects.sort((a, b) => a.name.localeCompare(b.name)))
    } catch (error) {
      console.error('Failed to load projects:', error)
    } finally {
      setIsLoadingProjects(false)
    }
  }, [])

  useEffect(() => {
    loadProjects()
  }, [loadProjects])

  const handleCreateProject = async () => {
    if (!packName.trim()) return
    if (projectType === 'plugin' && !packGroup.trim()) return

    setIsCreating(true)
    try {
      if (projectType === 'pack') {
        await window.hymn.createPack({
          name: packName,
          group: packGroup || undefined,
          version: packVersion || '1.0.0',
          description: packDescription || undefined,
          authorName: authorName || undefined,
          location: packLocation,
          includeCommon,
          includeServer,
        })
      } else {
        await window.hymn.createPlugin({
          name: packName,
          group: packGroup,
          version: packVersion || '0.0.1',
          description: packDescription || undefined,
          authorName: authorName || undefined,
          includesAssetPack,
          patchline,
        })
      }

      await loadProjects()
      setIsCreateDialogOpen(false)
      // Reset form state
      resetForm()
    } catch (error) {
      console.error(error)
    } finally {
      setIsCreating(false)
    }
  }

  const resetForm = () => {
    setPackName('')
    setPackGroup('')
    setPackVersion('1.0.0')
    setPackDescription('')
    setAuthorName('')
    setPackLocation('packs')
    setIncludeCommon(true)
    setIncludeServer(true)
    setIncludesAssetPack(true)
    setPatchline('release')
    setProjectType('pack')
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

  if (activeProject) {
    return (
      <ModWorkspace
        project={activeProject}
        onBack={() => {
          setActiveProject(null)
          loadProjects()
        }}
        onInstallChange={loadProjects}
      />
    )
  }

  return (
    <div className="space-y-8">
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogContent className="sm:max-w-[540px] border-border/50 bg-card">
            <DialogHeader>
              <DialogTitle className="text-xl">Create New Project</DialogTitle>
              <DialogDescription>
                {projectType === 'pack'
                  ? 'Create an asset pack with textures, models, and server data.'
                  : 'Create a Java plugin with Gradle build system and server API access.'}
              </DialogDescription>
            </DialogHeader>

            {/* Project Type Selector */}
            <div className="grid grid-cols-2 gap-3 py-2">
              <button
                type="button"
                onClick={() => setProjectType('pack')}
                className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all text-left ${
                  projectType === 'pack'
                    ? 'border-primary bg-primary/10'
                    : 'border-border hover:border-primary/50 hover:bg-muted/50'
                }`}
              >
                <div className={`p-2 rounded-lg ${projectType === 'pack' ? 'bg-primary/20' : 'bg-muted'}`}>
                  <Layers className={`h-5 w-5 ${projectType === 'pack' ? 'text-primary' : 'text-muted-foreground'}`} />
                </div>
                <div>
                  <div className="font-semibold text-sm">Asset Pack</div>
                  <div className="text-xs text-muted-foreground">Textures, models, data</div>
                </div>
              </button>
              <button
                type="button"
                onClick={() => setProjectType('plugin')}
                className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all text-left ${
                  projectType === 'plugin'
                    ? 'border-primary bg-primary/10'
                    : 'border-border hover:border-primary/50 hover:bg-muted/50'
                }`}
              >
                <div className={`p-2 rounded-lg ${projectType === 'plugin' ? 'bg-primary/20' : 'bg-muted'}`}>
                  <Code className={`h-5 w-5 ${projectType === 'plugin' ? 'text-primary' : 'text-muted-foreground'}`} />
                </div>
                <div>
                  <div className="font-semibold text-sm">Java Plugin</div>
                  <div className="text-xs text-muted-foreground">Code, commands, events</div>
                </div>
              </button>
            </div>

            <Separator />

            <div className="grid gap-4 py-2">
              {/* Common fields */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Project Name</Label>
                  <Input
                    id="name"
                    placeholder={projectType === 'pack' ? 'MyAssetPack' : 'MyPlugin'}
                    value={packName}
                    onChange={(e) => setPackName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="group">
                    {projectType === 'plugin' ? 'Package Group' : 'Group'}
                    {projectType === 'plugin' && <span className="text-destructive ml-1">*</span>}
                  </Label>
                  <Input
                    id="group"
                    placeholder="com.example"
                    value={packGroup}
                    onChange={(e) => setPackGroup(e.target.value)}
                  />
                  {projectType === 'plugin' && (
                    <p className="text-[10px] text-muted-foreground">Java package name (e.g., com.yourname)</p>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="version">Version</Label>
                  <Input
                    id="version"
                    placeholder={projectType === 'pack' ? '1.0.0' : '0.0.1'}
                    value={packVersion}
                    onChange={(e) => setPackVersion(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="author">Author</Label>
                  <Input
                    id="author"
                    placeholder="Your Name"
                    value={authorName}
                    onChange={(e) => setAuthorName(e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder={projectType === 'pack' ? 'What does this pack add?' : 'What does this plugin do?'}
                  value={packDescription}
                  onChange={(e) => setPackDescription(e.target.value)}
                  rows={2}
                />
              </div>

              <Separator className="my-1" />

              {/* Pack-specific options */}
              {projectType === 'pack' && (
                <>
                  <div className="space-y-2">
                    <Label>Location</Label>
                    <Select value={packLocation} onValueChange={(v) => setPackLocation(v as 'packs' | 'mods')}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="packs">UserData/Packs (Folder-based projects)</SelectItem>
                        <SelectItem value="mods">UserData/Mods (Standard mod location)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-3">
                    <Label className="text-xs uppercase font-bold text-muted-foreground">Scaffolding</Label>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex items-center space-x-2">
                        <Checkbox id="common" checked={includeCommon} onCheckedChange={(c) => setIncludeCommon(!!c)} />
                        <label htmlFor="common" className="text-sm font-medium leading-none">
                          Include Common
                        </label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox id="server" checked={includeServer} onCheckedChange={(c) => setIncludeServer(!!c)} />
                        <label htmlFor="server" className="text-sm font-medium leading-none">
                          Include Server
                        </label>
                      </div>
                    </div>
                  </div>
                </>
              )}

              {/* Plugin-specific options */}
              {projectType === 'plugin' && (
                <>
                  <div className="space-y-2">
                    <Label>Release Channel</Label>
                    <Select value={patchline} onValueChange={(v) => setPatchline(v as 'release' | 'pre-release')}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="release">Release (Stable)</SelectItem>
                        <SelectItem value="pre-release">Pre-Release (Beta)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-3">
                    <Label className="text-xs uppercase font-bold text-muted-foreground">Options</Label>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="assetPack"
                        checked={includesAssetPack}
                        onCheckedChange={(c) => setIncludesAssetPack(!!c)}
                      />
                      <label htmlFor="assetPack" className="text-sm font-medium leading-none">
                        Include Asset Pack Support
                      </label>
                    </div>
                    <p className="text-[10px] text-muted-foreground pl-6">
                      Enables in-game asset editor and allows bundling textures/models with your plugin.
                    </p>
                  </div>
                </>
              )}
            </div>

            <div className="flex justify-end gap-3 mt-2">
              <Button variant="outline" onClick={() => { setIsCreateDialogOpen(false); resetForm(); }}>
                Cancel
              </Button>
              <Button
                onClick={handleCreateProject}
                disabled={isCreating || !packName || (projectType === 'plugin' && !packGroup)}
                className="min-w-[140px]"
              >
                {isCreating ? 'Creating...' : `Create ${projectType === 'pack' ? 'Pack' : 'Plugin'}`}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">My Projects</h2>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsCreateDialogOpen(true)}
              className="h-8 gap-2"
            >
              <Plus className="h-4 w-4" />
              New Project
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={loadProjects}
              disabled={isLoadingProjects}
              className="h-8 gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${isLoadingProjects ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>

        {isLoadingProjects && projects.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 bg-card/20 border border-dashed rounded-3xl text-center px-6">
            <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin mb-4" />
            <p className="text-sm text-muted-foreground">Loading projects...</p>
          </div>
        ) : projects.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 bg-card/20 border border-dashed rounded-3xl text-center px-6">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <Package className="h-8 w-8 text-muted-foreground/50" />
            </div>
            <h3 className="text-lg font-bold mb-1">No projects found</h3>
            <p className="text-sm text-muted-foreground max-w-sm mb-6">
              You haven't created any Hytale projects yet. Start by creating a new pack to see it here.
            </p>
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(true)}>
              Start Creating
            </Button>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {projects.map((project) => (
              <ProjectCard
                key={project.id}
                project={project}
                onOpen={setActiveProject}
                onExplore={(path) => window.hymn.openInExplorer(path)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
