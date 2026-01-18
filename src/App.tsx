import { useEffect } from 'react'
import { createRouter, RouterProvider } from '@tanstack/react-router'
import { setupBeforeUnloadWarning } from '@/stores'
import { routeTree } from './routeTree.gen'

// Create a new router instance
const router = createRouter({ routeTree })

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

  return <RouterProvider router={router} />
}
