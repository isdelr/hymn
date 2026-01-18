import { create } from 'zustand'
import { devtools } from 'zustand/middleware'

interface DirtyFile {
  path: string
  content: string
  originalContent: string
}

interface DirtyFilesState {
  dirtyFiles: Map<string, DirtyFile>
}

interface DirtyFilesActions {
  setDirtyFile: (path: string, content: string, originalContent: string) => void
  clearDirtyFile: (path: string) => void
  clearAllDirtyFiles: () => void
  getDirtyContent: (path: string) => string | undefined
  isDirty: (path: string) => boolean
  hasAnyDirtyFiles: () => boolean
  getDirtyFilePaths: () => string[]
}

type DirtyFilesStore = DirtyFilesState & DirtyFilesActions

export const useDirtyFilesStore = create<DirtyFilesStore>()(
  devtools(
    (set, get) => ({
      dirtyFiles: new Map(),

      setDirtyFile: (path: string, content: string, originalContent: string) => {
        set((state) => {
          const next = new Map(state.dirtyFiles)
          // Only mark as dirty if content differs from original
          if (content !== originalContent) {
            next.set(path, { path, content, originalContent })
          } else {
            // If content matches original, it's no longer dirty
            next.delete(path)
          }
          return { dirtyFiles: next }
        })
      },

      clearDirtyFile: (path: string) => {
        set((state) => {
          const next = new Map(state.dirtyFiles)
          next.delete(path)
          return { dirtyFiles: next }
        })
      },

      clearAllDirtyFiles: () => {
        set({ dirtyFiles: new Map() })
      },

      getDirtyContent: (path: string) => {
        return get().dirtyFiles.get(path)?.content
      },

      isDirty: (path: string) => {
        return get().dirtyFiles.has(path)
      },

      hasAnyDirtyFiles: () => {
        return get().dirtyFiles.size > 0
      },

      getDirtyFilePaths: () => {
        return Array.from(get().dirtyFiles.keys())
      },
    }),
    { name: 'dirty-files-store' }
  )
)

// Convenience hook to set up beforeunload warning
export function setupBeforeUnloadWarning() {
  const handleBeforeUnload = (e: BeforeUnloadEvent) => {
    if (useDirtyFilesStore.getState().hasAnyDirtyFiles()) {
      e.preventDefault()
      e.returnValue = 'You have unsaved changes. Are you sure you want to leave?'
      return e.returnValue
    }
  }

  window.addEventListener('beforeunload', handleBeforeUnload)
  return () => window.removeEventListener('beforeunload', handleBeforeUnload)
}
