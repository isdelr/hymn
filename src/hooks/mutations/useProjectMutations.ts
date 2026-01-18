import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { queryKeys } from '../queries'
import type { CreatePackOptions, CreatePluginOptions, DeleteProjectOptions } from '@/shared/hymn-types'

export function useCreatePack() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (options: CreatePackOptions) => {
      return await window.hymn.createPack(options)
    },
    onSuccess: () => {
      toast.success('Pack created!')
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.all })
    },
    onError: () => {
      toast.error('Failed to create pack')
    },
  })
}

export function useCreatePlugin() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (options: CreatePluginOptions) => {
      return await window.hymn.createPlugin(options)
    },
    onSuccess: () => {
      toast.success('Plugin created!')
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.all })
    },
    onError: () => {
      toast.error('Failed to create plugin')
    },
  })
}

export function useDeleteProject() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (options: DeleteProjectOptions) => {
      return await window.hymn.deleteProject(options)
    },
    onSuccess: (result) => {
      if (result.success) {
        toast.success('Project deleted')
        queryClient.invalidateQueries({ queryKey: queryKeys.projects.all })
      } else {
        toast.error(result.error || 'Failed to delete project')
      }
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to delete project')
    },
  })
}

interface InstallProjectParams {
  projectPath: string
  projectType: 'pack' | 'plugin'
}

export function useInstallProject() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ projectPath, projectType }: InstallProjectParams) => {
      return await window.hymn.installProject({ projectPath, projectType })
    },
    onSuccess: (_, { projectType }) => {
      const label = projectType === 'plugin' ? 'Plugin' : 'Project'
      toast.success(`${label} installed for testing`)
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.all })
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to install project')
    },
  })
}

interface UninstallProjectParams {
  projectPath: string
}

export function useUninstallProject() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ projectPath }: UninstallProjectParams) => {
      return await window.hymn.uninstallProject({ projectPath })
    },
    onSuccess: () => {
      toast.success('Project uninstalled')
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.all })
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to uninstall project')
    },
  })
}

interface BuildProjectParams {
  projectPath: string
}

export function useBuildProject() {
  return useMutation({
    mutationFn: async ({ projectPath }: BuildProjectParams) => {
      return await window.hymn.buildMod({ path: projectPath })
    },
    onMutate: () => {
      toast.info('Building plugin...')
    },
    onSuccess: (result) => {
      if (result.success) {
        toast.success('Build complete!')
      } else {
        toast.error('Build failed. Check output for errors.')
      }
    },
    onError: () => {
      toast.error('Build failed')
    },
  })
}

interface PackageProjectParams {
  projectPath: string
}

export function usePackageProject() {
  return useMutation({
    mutationFn: async ({ projectPath }: PackageProjectParams) => {
      return await window.hymn.packageMod({ path: projectPath })
    },
    onSuccess: (result) => {
      toast.success(`Package created: ${result.outputPath}`)
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : 'Failed to package mod'
      if (!message.includes('cancelled')) {
        toast.error(message)
      }
    },
  })
}
