import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { queryKeys } from '../queries'
import type { JavaClassTemplate, JavaSourceFile } from '@/shared/hymn-types'

interface CreateJavaClassParams {
  projectPath: string
  packagePath: string
  className: string
  template: JavaClassTemplate
}

export function useCreateJavaClass() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (params: CreateJavaClassParams) => {
      const result = await window.hymn.createJavaClass(params)
      return { result, projectPath: params.projectPath }
    },
    onSuccess: ({ result, projectPath }) => {
      if (result.success) {
        toast.success(`Class created!`)
        queryClient.invalidateQueries({ queryKey: queryKeys.javaSources.all(projectPath) })
      }
      return result
    },
    onError: () => {
      toast.error('Failed to create class')
    },
  })
}

interface DeleteJavaFileParams {
  projectPath: string
  file: JavaSourceFile
}

export function useDeleteJavaFile() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ projectPath, file }: DeleteJavaFileParams) => {
      await window.hymn.deleteJavaClass({
        projectPath,
        relativePath: file.relativePath,
      })
      return { projectPath, fileId: file.id }
    },
    onSuccess: ({ projectPath }) => {
      toast.success('File deleted')
      queryClient.invalidateQueries({ queryKey: queryKeys.javaSources.all(projectPath) })
    },
    onError: () => {
      toast.error('Failed to delete file')
    },
  })
}

interface SaveJavaFileParams {
  filePath: string
  content: string
}

export function useSaveJavaFile() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ filePath, content }: SaveJavaFileParams) => {
      await window.hymn.saveFile(filePath, content)
      return { filePath }
    },
    onSuccess: ({ filePath }) => {
      toast.success('File saved')
      // Invalidate the file content query
      queryClient.invalidateQueries({ queryKey: queryKeys.javaSources.file(filePath) })
    },
    onError: () => {
      toast.error('Failed to save file')
    },
  })
}

interface RenameJavaFileParams {
  projectPath: string
  file: JavaSourceFile
  newClassName: string
}

export function useRenameJavaFile() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ projectPath, file, newClassName }: RenameJavaFileParams) => {
      const result = await window.hymn.renameJavaFile({
        projectPath,
        relativePath: file.relativePath,
        newClassName,
      })
      return { result, projectPath }
    },
    onSuccess: ({ result, projectPath }) => {
      if (result.success) {
        toast.success('File renamed')
        queryClient.invalidateQueries({ queryKey: queryKeys.javaSources.all(projectPath) })
      }
      return result
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to rename file')
    },
  })
}

interface DeleteJavaPackageParams {
  projectPath: string
  packagePath: string
}

export function useDeleteJavaPackage() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ projectPath, packagePath }: DeleteJavaPackageParams) => {
      const result = await window.hymn.deleteJavaPackage({
        projectPath,
        packagePath,
      })
      return { result, projectPath }
    },
    onSuccess: ({ result, projectPath }) => {
      if (result.success) {
        toast.success(`Package deleted (${result.deletedFiles} files)`)
        queryClient.invalidateQueries({ queryKey: queryKeys.javaSources.all(projectPath) })
      }
      return result
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to delete package')
    },
  })
}

interface RenameJavaPackageParams {
  projectPath: string
  oldPackagePath: string
  newPackageName: string
}

export function useRenameJavaPackage() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ projectPath, oldPackagePath, newPackageName }: RenameJavaPackageParams) => {
      const result = await window.hymn.renameJavaPackage({
        projectPath,
        oldPackagePath,
        newPackageName,
      })
      return { result, projectPath }
    },
    onSuccess: ({ result, projectPath }) => {
      if (result.success) {
        toast.success(`Package renamed (${result.renamedFiles} files updated)`)
        queryClient.invalidateQueries({ queryKey: queryKeys.javaSources.all(projectPath) })
      }
      return result
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to rename package')
    },
  })
}
