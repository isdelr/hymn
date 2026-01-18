import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { queryKeys } from '../queries'
import type { BuildPluginOptions, BuildPackOptions, BuildPluginResult, BuildPackResult } from '@/shared/hymn-types'

export function useBuildPlugin() {
  const queryClient = useQueryClient()

  return useMutation<BuildPluginResult, Error, BuildPluginOptions>({
    mutationFn: async (options) => {
      return await window.hymn.buildPlugin(options)
    },
    onMutate: () => {
      toast.info('Building plugin...')
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.builds.artifacts })
      if (result.success) {
        if (result.artifact) {
          toast.success(`Build complete! Created ${result.artifact.projectName}-${result.artifact.version}.jar`)
        } else {
          toast.success('Build complete!')
        }
      } else {
        toast.error('Build failed. Check output for errors.')
      }
    },
    onError: (error) => {
      toast.error(error.message || 'Build failed')
    },
  })
}

export function useBuildPack() {
  const queryClient = useQueryClient()

  return useMutation<BuildPackResult, Error, BuildPackOptions>({
    mutationFn: async (options) => {
      return await window.hymn.buildPack(options)
    },
    onMutate: () => {
      toast.info('Packaging asset pack...')
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.builds.artifacts })
      if (result.success && result.artifact) {
        toast.success(`Package complete! Created ${result.artifact.projectName}-${result.artifact.version}.zip`)
      } else {
        toast.error('Packaging failed.')
      }
    },
    onError: (error) => {
      toast.error(error.message || 'Packaging failed')
    },
  })
}

interface DeleteBuildArtifactParams {
  artifactId: string
}

export function useDeleteBuildArtifact() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ artifactId }: DeleteBuildArtifactParams) => {
      return await window.hymn.deleteBuildArtifact({ artifactId })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.builds.artifacts })
      toast.success('Artifact deleted')
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to delete artifact')
    },
  })
}

export function useClearAllBuildArtifacts() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async () => {
      return await window.hymn.clearAllBuildArtifacts()
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.builds.artifacts })
      toast.success(`Cleared ${result.deletedCount} build artifact${result.deletedCount === 1 ? '' : 's'}`)
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to clear build artifacts')
    },
  })
}

interface CopyArtifactToModsParams {
  artifactId: string
}

export function useCopyArtifactToMods() {
  return useMutation({
    mutationFn: async ({ artifactId }: CopyArtifactToModsParams) => {
      return await window.hymn.copyArtifactToMods(artifactId)
    },
    onSuccess: (result) => {
      toast.success(`Installed to ${result.destinationPath}`)
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to install artifact')
    },
  })
}

export function useRevealBuildArtifact() {
  return useMutation({
    mutationFn: async (artifactId: string) => {
      return await window.hymn.revealBuildArtifact(artifactId)
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to reveal artifact')
    },
  })
}

export function useSetJdkPath() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (jdkPath: string | null) => {
      await window.hymnSettings.setJdkPath(jdkPath)
      return jdkPath
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.settings.jdkPath })
      queryClient.invalidateQueries({ queryKey: queryKeys.builds.dependencies })
      toast.success('JDK path updated')
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to update JDK path')
    },
  })
}

export function useSelectJdkPath() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async () => {
      return await window.hymnSettings.selectJdkPath()
    },
    onSuccess: (selectedPath) => {
      if (selectedPath) {
        queryClient.invalidateQueries({ queryKey: queryKeys.settings.jdkPath })
        queryClient.invalidateQueries({ queryKey: queryKeys.builds.dependencies })
        toast.success('JDK path updated')
      }
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to select JDK path')
    },
  })
}

export function useOpenBuildsFolder() {
  return useMutation({
    mutationFn: async () => {
      return await window.hymn.openBuildsFolder()
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to open builds folder')
    },
  })
}

export function useSetServerJarPath() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (serverJarPath: string | null) => {
      await window.hymnSettings.setServerJarPath(serverJarPath)
      return serverJarPath
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.settings.serverJarPath })
      queryClient.invalidateQueries({ queryKey: queryKeys.builds.dependencies })
      toast.success('HytaleServer.jar path updated')
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to update server jar path')
    },
  })
}

export function useSelectServerJarPath() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async () => {
      return await window.hymnSettings.selectServerJarPath()
    },
    onSuccess: (selectedPath) => {
      if (selectedPath) {
        queryClient.invalidateQueries({ queryKey: queryKeys.settings.serverJarPath })
        queryClient.invalidateQueries({ queryKey: queryKeys.builds.dependencies })
        toast.success('HytaleServer.jar path updated')
      }
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to select server jar path')
    },
  })
}
