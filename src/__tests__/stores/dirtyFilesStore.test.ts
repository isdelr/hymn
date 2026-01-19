import { describe, expect, it, beforeEach } from 'vitest'
import { useDirtyFilesStore } from '@/stores/dirtyFilesStore'

describe('dirtyFilesStore', () => {
  beforeEach(() => {
    // Reset store state before each test
    useDirtyFilesStore.setState({ dirtyFiles: new Map() })
  })

  describe('setDirtyFile', () => {
    it('adds file when content differs from original', () => {
      const store = useDirtyFilesStore.getState()
      store.setDirtyFile('/path/to/file.ts', 'new content', 'original content')

      expect(useDirtyFilesStore.getState().isDirty('/path/to/file.ts')).toBe(true)
      expect(useDirtyFilesStore.getState().getDirtyContent('/path/to/file.ts')).toBe('new content')
    })

    it('removes file when content matches original', () => {
      const store = useDirtyFilesStore.getState()
      // First make it dirty
      store.setDirtyFile('/path/to/file.ts', 'new content', 'original content')
      expect(useDirtyFilesStore.getState().isDirty('/path/to/file.ts')).toBe(true)

      // Now set it back to original content
      store.setDirtyFile('/path/to/file.ts', 'original content', 'original content')
      expect(useDirtyFilesStore.getState().isDirty('/path/to/file.ts')).toBe(false)
    })

    it('does not add file when content is same as original', () => {
      const store = useDirtyFilesStore.getState()
      store.setDirtyFile('/path/to/file.ts', 'same content', 'same content')

      expect(useDirtyFilesStore.getState().isDirty('/path/to/file.ts')).toBe(false)
    })
  })

  describe('clearDirtyFile', () => {
    it('removes a specific dirty file', () => {
      const store = useDirtyFilesStore.getState()
      store.setDirtyFile('/path/to/file1.ts', 'new', 'original')
      store.setDirtyFile('/path/to/file2.ts', 'new', 'original')

      expect(useDirtyFilesStore.getState().isDirty('/path/to/file1.ts')).toBe(true)
      expect(useDirtyFilesStore.getState().isDirty('/path/to/file2.ts')).toBe(true)

      store.clearDirtyFile('/path/to/file1.ts')

      expect(useDirtyFilesStore.getState().isDirty('/path/to/file1.ts')).toBe(false)
      expect(useDirtyFilesStore.getState().isDirty('/path/to/file2.ts')).toBe(true)
    })

    it('does nothing when clearing non-existent file', () => {
      const store = useDirtyFilesStore.getState()
      store.clearDirtyFile('/non/existent/file.ts')

      expect(useDirtyFilesStore.getState().hasAnyDirtyFiles()).toBe(false)
    })
  })

  describe('clearAllDirtyFiles', () => {
    it('removes all dirty files', () => {
      const store = useDirtyFilesStore.getState()
      store.setDirtyFile('/path/to/file1.ts', 'new', 'original')
      store.setDirtyFile('/path/to/file2.ts', 'new', 'original')
      store.setDirtyFile('/path/to/file3.ts', 'new', 'original')

      expect(useDirtyFilesStore.getState().hasAnyDirtyFiles()).toBe(true)

      store.clearAllDirtyFiles()

      expect(useDirtyFilesStore.getState().hasAnyDirtyFiles()).toBe(false)
    })
  })

  describe('isDirty', () => {
    it('returns true for dirty files', () => {
      const store = useDirtyFilesStore.getState()
      store.setDirtyFile('/path/to/file.ts', 'new', 'original')

      expect(useDirtyFilesStore.getState().isDirty('/path/to/file.ts')).toBe(true)
    })

    it('returns false for non-dirty files', () => {
      expect(useDirtyFilesStore.getState().isDirty('/path/to/file.ts')).toBe(false)
    })
  })

  describe('hasAnyDirtyFiles', () => {
    it('returns true when there are dirty files', () => {
      const store = useDirtyFilesStore.getState()
      store.setDirtyFile('/path/to/file.ts', 'new', 'original')

      expect(useDirtyFilesStore.getState().hasAnyDirtyFiles()).toBe(true)
    })

    it('returns false when there are no dirty files', () => {
      expect(useDirtyFilesStore.getState().hasAnyDirtyFiles()).toBe(false)
    })
  })

  describe('getDirtyContent', () => {
    it('returns content for dirty file', () => {
      const store = useDirtyFilesStore.getState()
      store.setDirtyFile('/path/to/file.ts', 'modified content', 'original content')

      expect(useDirtyFilesStore.getState().getDirtyContent('/path/to/file.ts')).toBe('modified content')
    })

    it('returns undefined for non-dirty file', () => {
      expect(useDirtyFilesStore.getState().getDirtyContent('/path/to/file.ts')).toBeUndefined()
    })
  })

  describe('getDirtyFilePaths', () => {
    it('returns all dirty file paths', () => {
      const store = useDirtyFilesStore.getState()
      store.setDirtyFile('/path/to/file1.ts', 'new', 'original')
      store.setDirtyFile('/path/to/file2.ts', 'new', 'original')

      const paths = useDirtyFilesStore.getState().getDirtyFilePaths()

      expect(paths).toHaveLength(2)
      expect(paths).toContain('/path/to/file1.ts')
      expect(paths).toContain('/path/to/file2.ts')
    })

    it('returns empty array when no dirty files', () => {
      expect(useDirtyFilesStore.getState().getDirtyFilePaths()).toEqual([])
    })
  })
})
