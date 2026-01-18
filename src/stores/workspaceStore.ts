import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import type { ProjectEntry, ServerAsset, JavaSourceFile } from '@/shared/hymn-types'
import { useDirtyFilesStore } from './dirtyFilesStore'

/**
 * WorkspaceStore - UI State Only
 *
 * This store now only manages UI state for the workspace.
 * Data (assets, sources) is managed by React Query.
 * Loading states are derived from React Query's isLoading/isPending.
 */

type WorkspaceMode = 'source' | 'assets'

interface AssetTemplate {
  id: string
  label: string
  category: string
}

interface JavaTemplate {
  id: string
  label: string
  suggestedPackage?: string
}

interface WorkspaceState {
  // Project context
  project: ProjectEntry | null

  // Mode (for plugins with assets)
  mode: WorkspaceMode

  // Navigation
  activeCategory: string
  selectedAsset: ServerAsset | null
  selectedFile: JavaSourceFile | null

  // Asset Modals
  isTemplateGalleryOpen: boolean
  isNameDialogOpen: boolean
  pendingTemplate: AssetTemplate | null
  assetToRename: ServerAsset | null

  // Java Modals
  isJavaTemplateGalleryOpen: boolean
  isClassNameDialogOpen: boolean
  pendingJavaTemplate: JavaTemplate | null

  // Navigation guards
  showUnsavedDialog: boolean
  pendingNavigation: (() => void) | null
}

interface WorkspaceActions {
  // Project lifecycle
  initWorkspace: (project: ProjectEntry) => void
  resetWorkspace: () => void

  // Mode & Navigation
  setMode: (mode: WorkspaceMode) => void
  setActiveCategory: (category: string) => void
  setSelectedAsset: (asset: ServerAsset | null) => void
  setSelectedFile: (file: JavaSourceFile | null) => void

  // Asset Modal actions
  openTemplateGallery: () => void
  closeTemplateGallery: () => void
  openNameDialog: (template?: AssetTemplate, asset?: ServerAsset) => void
  closeNameDialog: () => void

  // Java Modal actions
  openJavaTemplateGallery: () => void
  closeJavaTemplateGallery: () => void
  openClassNameDialog: (template: JavaTemplate) => void
  closeClassNameDialog: () => void

  // Navigation guards
  attemptNavigation: (navigationFn: () => void) => void
  openUnsavedDialog: (pendingFn: () => void) => void
  closeUnsavedDialog: () => void
  confirmDiscardAndNavigate: () => void
}

type WorkspaceStore = WorkspaceState & WorkspaceActions

const initialState: WorkspaceState = {
  project: null,
  mode: 'source',
  activeCategory: 'all',
  selectedAsset: null,
  selectedFile: null,
  isTemplateGalleryOpen: false,
  isNameDialogOpen: false,
  pendingTemplate: null,
  assetToRename: null,
  isJavaTemplateGalleryOpen: false,
  isClassNameDialogOpen: false,
  pendingJavaTemplate: null,
  showUnsavedDialog: false,
  pendingNavigation: null,
}

export const useWorkspaceStore = create<WorkspaceStore>()(
  devtools(
    (set, get) => ({
      ...initialState,

      // Project lifecycle
      initWorkspace: (project: ProjectEntry) => {
        set({
          ...initialState,
          project,
          mode: project.type === 'plugin' ? 'source' : 'assets',
        })
      },

      resetWorkspace: () => {
        useDirtyFilesStore.getState().clearAllDirtyFiles()
        set(initialState)
      },

      // Mode & Navigation
      setMode: (mode) => set({ mode }),
      setActiveCategory: (category) => set({ activeCategory: category }),
      setSelectedAsset: (asset) => set({ selectedAsset: asset }),
      setSelectedFile: (file) => set({ selectedFile: file }),

      // Asset Modal actions
      openTemplateGallery: () => set({ isTemplateGalleryOpen: true }),
      closeTemplateGallery: () => set({ isTemplateGalleryOpen: false }),

      openNameDialog: (template, asset) => {
        set({
          isNameDialogOpen: true,
          pendingTemplate: template ?? null,
          assetToRename: asset ?? null,
        })
      },
      closeNameDialog: () => {
        set({
          isNameDialogOpen: false,
          pendingTemplate: null,
          assetToRename: null,
        })
      },

      // Java Modal actions
      openJavaTemplateGallery: () => set({ isJavaTemplateGalleryOpen: true }),
      closeJavaTemplateGallery: () => set({ isJavaTemplateGalleryOpen: false }),

      openClassNameDialog: (template) => {
        set({
          isClassNameDialogOpen: true,
          pendingJavaTemplate: template,
        })
      },
      closeClassNameDialog: () => {
        set({
          isClassNameDialogOpen: false,
          pendingJavaTemplate: null,
        })
      },

      // Navigation guards
      attemptNavigation: (navigationFn: () => void) => {
        if (useDirtyFilesStore.getState().hasAnyDirtyFiles()) {
          set({ pendingNavigation: () => navigationFn, showUnsavedDialog: true })
        } else {
          navigationFn()
        }
      },

      openUnsavedDialog: (pendingFn: () => void) => {
        set({ pendingNavigation: () => pendingFn, showUnsavedDialog: true })
      },

      closeUnsavedDialog: () => {
        set({ showUnsavedDialog: false, pendingNavigation: null })
      },

      confirmDiscardAndNavigate: () => {
        const { pendingNavigation } = get()
        useDirtyFilesStore.getState().clearAllDirtyFiles()
        set({ showUnsavedDialog: false })
        if (pendingNavigation) {
          pendingNavigation()
          set({ pendingNavigation: null })
        }
      },
    }),
    { name: 'workspace-store' }
  )
)
