import { useEffect } from 'react'
import { createRouter, RouterProvider, createHashHistory } from '@tanstack/react-router'
import { setupBeforeUnloadWarning } from '@/stores'
import { FileWatcherProvider } from '@/providers/FileWatcherProvider'
import { routeTree } from './routeTree.gen'

// Create a new router instance with hash history for Electron compatibility
const hashHistory = createHashHistory()
const router = createRouter({ routeTree, history: hashHistory })

// Register the router instance for type safety
declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}

export function App() {
  // Beforeunload warning for dirty files
  useEffect(() => {
    return setupBeforeUnloadWarning()
  }, [])

  return (
    <FileWatcherProvider>
      <RouterProvider router={router} />
    </FileWatcherProvider>
  )
}
