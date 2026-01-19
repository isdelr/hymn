import { useState, useCallback, useEffect, useRef } from 'react'
import { useNavigate } from '@tanstack/react-router'

interface NavigationGuardOptions {
  /**
   * Whether there are unsaved changes that should block navigation
   */
  hasUnsavedChanges: boolean
  /**
   * Callback to save changes before navigating
   */
  onSave?: () => Promise<void> | void
  /**
   * Callback when user confirms discard
   */
  onDiscard?: () => void
}

interface NavigationGuardState {
  /**
   * Whether the unsaved changes dialog is visible
   */
  showDialog: boolean
  /**
   * The destination path that was blocked
   */
  blockedPath: string | null
  /**
   * Proceed with navigation (discard changes)
   */
  proceed: () => void
  /**
   * Cancel navigation (stay on page)
   */
  cancel: () => void
  /**
   * Save and then navigate
   */
  saveAndProceed: () => Promise<void>
  /**
   * Attempt to navigate - will show dialog if there are unsaved changes
   */
  attemptNavigation: (path: string) => void
  /**
   * Force navigation without checking for unsaved changes
   */
  forceNavigate: (path: string) => void
}

/**
 * Hook for handling unsaved changes warning pattern.
 * Shows a confirmation dialog when attempting to navigate with unsaved changes.
 *
 * Note: This hook handles programmatic navigation via attemptNavigation().
 * Browser back/forward buttons are handled via beforeunload event.
 */
export function useNavigationGuard(options: NavigationGuardOptions): NavigationGuardState {
  const { hasUnsavedChanges, onSave, onDiscard } = options
  const navigate = useNavigate()
  const [showDialog, setShowDialog] = useState(false)
  const [blockedPath, setBlockedPath] = useState<string | null>(null)
  const pendingNavigationRef = useRef<string | null>(null)

  const proceed = useCallback(() => {
    if (onDiscard) {
      onDiscard()
    }
    setShowDialog(false)

    if (pendingNavigationRef.current) {
      navigate({ to: pendingNavigationRef.current })
    }

    setBlockedPath(null)
    pendingNavigationRef.current = null
  }, [navigate, onDiscard])

  const cancel = useCallback(() => {
    setShowDialog(false)
    setBlockedPath(null)
    pendingNavigationRef.current = null
  }, [])

  const saveAndProceed = useCallback(async () => {
    if (onSave) {
      await onSave()
    }
    setShowDialog(false)

    if (pendingNavigationRef.current) {
      navigate({ to: pendingNavigationRef.current })
    }

    setBlockedPath(null)
    pendingNavigationRef.current = null
  }, [navigate, onSave])

  const attemptNavigation = useCallback((path: string) => {
    if (hasUnsavedChanges) {
      pendingNavigationRef.current = path
      setBlockedPath(path)
      setShowDialog(true)
    } else {
      navigate({ to: path })
    }
  }, [hasUnsavedChanges, navigate])

  const forceNavigate = useCallback((path: string) => {
    pendingNavigationRef.current = null
    setShowDialog(false)
    setBlockedPath(null)
    navigate({ to: path })
  }, [navigate])

  // Handle browser beforeunload event
  useEffect(() => {
    if (!hasUnsavedChanges) return

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = ''
      return ''
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [hasUnsavedChanges])

  return {
    showDialog,
    blockedPath,
    proceed,
    cancel,
    saveAndProceed,
    attemptNavigation,
    forceNavigate,
  }
}
