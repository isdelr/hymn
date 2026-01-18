import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { queryKeys } from '../queries'
import type { ServerAsset, ServerAssetTemplate } from '@/shared/hymn-types'

interface CreateAssetParams {
  projectPath: string
  destination: string
  name: string
  template: ServerAssetTemplate
}

export function useCreateAsset() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (params: CreateAssetParams) => {
      const result = await window.hymn.createServerAsset({
        path: params.projectPath,
        destination: params.destination,
        name: params.name,
        template: params.template,
      })
      return { result, projectPath: params.projectPath }
    },
    onSuccess: ({ result, projectPath }) => {
      if (result.success) {
        toast.success('Asset created!')
        queryClient.invalidateQueries({ queryKey: queryKeys.assets.all(projectPath) })
      }
      return result
    },
    onError: () => {
      toast.error('Failed to create asset')
    },
  })
}

interface DeleteAssetParams {
  projectPath: string
  asset: ServerAsset
}

export function useDeleteAsset() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ projectPath, asset }: DeleteAssetParams) => {
      await window.hymn.deleteServerAsset({
        path: projectPath,
        relativePath: asset.relativePath,
      })
      return { projectPath }
    },
    onSuccess: ({ projectPath }) => {
      toast.success('Asset deleted')
      queryClient.invalidateQueries({ queryKey: queryKeys.assets.all(projectPath) })
    },
    onError: () => {
      toast.error('Failed to delete asset')
    },
  })
}

interface RenameAssetParams {
  projectPath: string
  asset: ServerAsset
  newName: string
}

export function useRenameAsset() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ projectPath, asset, newName }: RenameAssetParams) => {
      const oldPath = asset.relativePath
      const lastDotIndex = oldPath.lastIndexOf('.')
      const extension = lastDotIndex !== -1 ? oldPath.substring(lastDotIndex) : ''
      const directory = oldPath.substring(0, oldPath.lastIndexOf('/'))
      const newPath = `${directory}/${newName}${extension}`

      await window.hymn.moveServerAsset({
        path: projectPath,
        source: oldPath,
        destination: newPath,
      })
      return { projectPath }
    },
    onSuccess: ({ projectPath }) => {
      toast.success('Asset renamed')
      queryClient.invalidateQueries({ queryKey: queryKeys.assets.all(projectPath) })
    },
    onError: () => {
      toast.error('Failed to rename asset')
    },
  })
}

interface SaveAssetParams {
  filePath: string
  content: string
}

export function useSaveAsset() {
  return useMutation({
    mutationFn: async ({ filePath, content }: SaveAssetParams) => {
      await window.hymn.saveFile(filePath, content)
      return { filePath }
    },
    onSuccess: () => {
      toast.success('Asset saved successfully')
    },
    onError: () => {
      toast.error('Failed to save asset')
    },
  })
}
