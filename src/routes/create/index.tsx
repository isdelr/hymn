import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import {
  Package,
  Plus,
  Code,
  Layers,
  HelpCircle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { ProjectEntry } from '@/shared/hymn-types'
import { ProjectCard } from '@/components/create/ProjectCard'
import { DependencyBanner } from '@/components/create/DependencyBanner'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

// React Query hooks
import { useInstallInfo, useProjects } from '@/hooks/queries'
import { useCreatePack, useCreatePlugin, useDeleteProject } from '@/hooks/mutations'

export const Route = createFileRoute('/create/')({
  component: CreateIndexPage,
})

function InfoTooltip({ children }: { children: React.ReactNode }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button type="button" className="ml-1 text-muted-foreground hover:text-foreground">
          <HelpCircle className="h-3 w-3" />
        </button>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-[240px] text-xs">
        {children}
      </TooltipContent>
    </Tooltip>
  )
}

type ProjectType = 'pack' | 'plugin'

function CreateIndexPage() {
  // React Query data
  const { data: installInfo } = useInstallInfo()
  const { data: projects = [], isLoading: isLoadingProjects } = useProjects()

  // Mutations
  const createPack = useCreatePack()
  const createPlugin = useCreatePlugin()
  const deleteProject = useDeleteProject()

  const navigate = useNavigate()

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [projectType, setProjectType] = useState<ProjectType>('pack')
  const [projectToDelete, setProjectToDelete] = useState<ProjectEntry | null>(null)

  // Common Creation State
  const [projectName, setProjectName] = useState('')
  const [projectGroup, setProjectGroup] = useState('')
  const [projectVersion, setProjectVersion] = useState('1.0.0')
  const [projectDescription, setProjectDescription] = useState('')
  const [authorName, setAuthorName] = useState('')

  // Plugin-specific state
  const [hytaleVersion, setHytaleVersion] = useState<'release' | 'pre-release'>('release')

  const isCreating = createPack.isPending || createPlugin.isPending

  const handleCreateProject = async () => {
    if (!projectName.trim()) return
    if (projectType === 'plugin' && !projectGroup.trim()) return

    try {
      let createdPath: string | undefined

      if (projectType === 'pack') {
        const result = await createPack.mutateAsync({
          name: projectName,
          group: projectGroup || undefined,
          version: projectVersion || '1.0.0',
          description: projectDescription || undefined,
          authorName: authorName || undefined,
          location: 'packs',
          includeCommon: true,
          includeServer: true,
        })
        createdPath = result.path
      } else {
        const result = await createPlugin.mutateAsync({
          name: projectName,
          group: projectGroup,
          version: projectVersion || '0.0.1',
          description: projectDescription || undefined,
          authorName: authorName || undefined,
          includesAssetPack: true,
          patchline: hytaleVersion,
        })
        createdPath = result.path
      }

      setIsCreateDialogOpen(false)
      resetForm()

      // Load projects and find the newly created one to navigate to it
      if (createdPath) {
        const result = await window.hymn.listProjects()
        const createdProject = result.projects.find(p => p.path === createdPath)
        if (createdProject) {
          navigate({ to: '/create/$projectId', params: { projectId: createdProject.id } })
        }
      }
    } catch (error) {
      console.error(error)
    }
  }

  const resetForm = () => {
    setProjectName('')
    setProjectGroup('')
    setProjectVersion('1.0.0')
    setProjectDescription('')
    setAuthorName('')
    setHytaleVersion('release')
    setProjectType('pack')
  }

  const confirmDeleteProject = async () => {
    if (!projectToDelete) return
    await deleteProject.mutateAsync({ projectPath: projectToDelete.path })
    setProjectToDelete(null)
  }

  const handleOpenProject = (project: ProjectEntry) => {
    navigate({ to: '/create/$projectId', params: { projectId: project.id } })
  }

  const hasInstall = !!installInfo?.activePath

  if (!hasInstall) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <Package className="mb-4 h-12 w-12 text-muted-foreground/50" />
        <h2 className="mb-2 text-lg font-medium">No Install Detected</h2>
        <p className="text-sm text-muted-foreground">
          Configure your Hytale install path in Settings to start creating.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Dependency Banner */}
      <DependencyBanner />

      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="sm:max-w-[480px] border-border/50 bg-card">
          <DialogHeader>
            <DialogTitle className="text-xl">Create New Project</DialogTitle>
            <DialogDescription>
              {projectType === 'pack'
                ? 'Add blocks, items, mobs, and other content using the Asset Editor.'
                : 'Write Java code using the Hytale server API.'}
            </DialogDescription>
          </DialogHeader>

          {/* Project Type Selector */}
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setProjectType('pack')}
              className={`flex items-center gap-3 p-3 rounded-lg border transition-colors text-left ${
                projectType === 'pack'
                  ? 'border-primary bg-primary/10'
                  : 'border-border hover:border-border hover:bg-muted/50'
              }`}
            >
              <div className={`p-2 rounded-md ${projectType === 'pack' ? 'bg-primary/20' : 'bg-muted'}`}>
                <Layers className={`h-4 w-4 ${projectType === 'pack' ? 'text-primary' : 'text-muted-foreground'}`} />
              </div>
              <div>
                <div className="font-medium text-sm">Pack</div>
                <div className="text-[11px] text-muted-foreground">Assets & content</div>
              </div>
            </button>
            <button
              type="button"
              onClick={() => setProjectType('plugin')}
              className={`flex items-center gap-3 p-3 rounded-lg border transition-colors text-left ${
                projectType === 'plugin'
                  ? 'border-primary bg-primary/10'
                  : 'border-border hover:border-border hover:bg-muted/50'
              }`}
            >
              <div className={`p-2 rounded-md ${projectType === 'plugin' ? 'bg-primary/20' : 'bg-muted'}`}>
                <Code className={`h-4 w-4 ${projectType === 'plugin' ? 'text-primary' : 'text-muted-foreground'}`} />
              </div>
              <div>
                <div className="font-medium text-sm">Plugin</div>
                <div className="text-[11px] text-muted-foreground">Java code</div>
              </div>
            </button>
          </div>

          <Separator />

          <div className="grid gap-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="name" className="text-xs">Name</Label>
                <Input
                  id="name"
                  placeholder={projectType === 'pack' ? 'MyPack' : 'MyPlugin'}
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center">
                  <Label htmlFor="group" className="text-xs">
                    {projectType === 'plugin' ? 'Package' : 'Group'}
                    {projectType === 'plugin' && <span className="text-destructive ml-0.5">*</span>}
                  </Label>
                  <InfoTooltip>
                    {projectType === 'plugin'
                      ? 'A unique identifier for your plugin, written like a reversed website. Example: com.yourname or io.github.yourname'
                      : 'Optional identifier to organize your packs. Example: com.yourname'}
                  </InfoTooltip>
                </div>
                <Input
                  id="group"
                  placeholder="com.example"
                  value={projectGroup}
                  onChange={(e) => setProjectGroup(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <div className="flex items-center">
                  <Label htmlFor="version" className="text-xs">Version</Label>
                  <InfoTooltip>
                    Version number using MAJOR.MINOR.PATCH format. Increase MAJOR for big changes, MINOR for new features, PATCH for fixes.
                  </InfoTooltip>
                </div>
                <Input
                  id="version"
                  placeholder="1.0.0"
                  value={projectVersion}
                  onChange={(e) => setProjectVersion(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="author" className="text-xs">Author</Label>
                <Input
                  id="author"
                  placeholder="Your Name"
                  value={authorName}
                  onChange={(e) => setAuthorName(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="description" className="text-xs">Description</Label>
              <Textarea
                id="description"
                placeholder="What does this project do?"
                value={projectDescription}
                onChange={(e) => setProjectDescription(e.target.value)}
                rows={2}
              />
            </div>

            {/* Plugin-specific: Hytale version */}
            {projectType === 'plugin' && (
              <div className="space-y-1.5">
                <div className="flex items-center">
                  <Label className="text-xs">Hytale Version</Label>
                  <InfoTooltip>
                    Which Hytale version to build against. Use Release for the stable game, or Pre-Release to test upcoming features.
                  </InfoTooltip>
                </div>
                <Select value={hytaleVersion} onValueChange={(v) => setHytaleVersion(v as 'release' | 'pre-release')}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="release">Release</SelectItem>
                    <SelectItem value="pre-release">Pre-Release</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={() => { setIsCreateDialogOpen(false); resetForm(); }}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleCreateProject}
              disabled={isCreating || !projectName || (projectType === 'plugin' && !projectGroup)}
            >
              {isCreating ? 'Creating...' : 'Create'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Projects */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">My Projects</h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsCreateDialogOpen(true)}
            className="h-8 gap-2"
          >
            <Plus className="h-4 w-4" />
            New Project
          </Button>
        </div>

        {isLoadingProjects && projects.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 bg-card/20 border border-dashed rounded-xl text-center px-6">
            <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin mb-4" />
            <p className="text-sm text-muted-foreground">Loading projects...</p>
          </div>
        ) : projects.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 bg-card/20 border border-dashed rounded-xl text-center px-6">
            <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mb-4">
              <Package className="h-7 w-7 text-muted-foreground/50" />
            </div>
            <h3 className="text-base font-medium mb-1">No projects yet</h3>
            <p className="text-sm text-muted-foreground max-w-xs mb-5">
              Create a pack or plugin to get started.
            </p>
            <Button variant="outline" size="sm" onClick={() => setIsCreateDialogOpen(true)}>
              Create Project
            </Button>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {projects.map((project) => (
              <ProjectCard
                key={project.id}
                project={project}
                onOpen={handleOpenProject}
                onExplore={(path) => window.hymn.openInExplorer(path)}
                onDelete={setProjectToDelete}
              />
            ))}
          </div>
        )}
      </div>

      {/* Delete Project Confirmation Dialog */}
      <AlertDialog open={!!projectToDelete} onOpenChange={() => setProjectToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Project</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{projectToDelete?.name}</strong>? This will permanently remove all project files. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteProject}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
