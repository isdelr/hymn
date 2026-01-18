import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState, useEffect, useCallback } from 'react'
import { Package } from 'lucide-react'
import type { ProjectEntry } from '@/shared/hymn-types'
import { ModWorkspace } from '@/components/create/ModWorkspace'

export const Route = createFileRoute('/create/$projectId')({
  component: ProjectWorkspacePage,
})

function ProjectWorkspacePage() {
  const { projectId } = Route.useParams()
  const navigate = useNavigate()
  const [project, setProject] = useState<ProjectEntry | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadProject = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const result = await window.hymn.listProjects()
      const found = result.projects.find(p => p.id === projectId)
      if (found) {
        setProject(found)
      } else {
        setError('Project not found')
      }
    } catch (err) {
      console.error('Failed to load project:', err)
      setError('Failed to load project')
    } finally {
      setIsLoading(false)
    }
  }, [projectId])

  useEffect(() => {
    loadProject()
  }, [loadProject])

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin mb-4" />
        <p className="text-sm text-muted-foreground">Loading project...</p>
      </div>
    )
  }

  if (error || !project) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <Package className="mb-4 h-12 w-12 text-muted-foreground/50" />
        <h2 className="mb-2 text-lg font-medium">{error || 'Project Not Found'}</h2>
        <p className="text-sm text-muted-foreground mb-4">
          The requested project could not be loaded.
        </p>
        <button
          onClick={() => navigate({ to: '/create' })}
          className="text-sm text-primary hover:underline"
        >
          Return to projects
        </button>
      </div>
    )
  }

  return (
    <ModWorkspace
      project={project}
    />
  )
}
