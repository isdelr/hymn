import { render, type RenderOptions } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createRouter, RouterProvider } from '@tanstack/react-router'
import { routeTree } from '@/routeTree.gen'
import { createTestQueryClient } from '@/test/setup'
import type { ReactNode } from 'react'

interface WrapperOptions {
  queryClient?: QueryClient
}

export function createWrapper(options: WrapperOptions = {}) {
  const queryClient = options.queryClient ?? createTestQueryClient()

  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    )
  }
}

interface RenderWithProvidersOptions extends Omit<RenderOptions, 'wrapper'> {
  queryClient?: QueryClient
}

export function renderWithProviders(
  ui: React.ReactElement,
  options: RenderWithProvidersOptions = {}
) {
  const { queryClient, ...renderOptions } = options
  const client = queryClient ?? createTestQueryClient()

  return {
    ...render(ui, {
      wrapper: createWrapper({ queryClient: client }),
      ...renderOptions,
    }),
    queryClient: client,
  }
}

const createTestRouter = () => {
  return createRouter({
    routeTree,
    defaultPreload: false,
  })
}

export async function renderApp(queryClient?: QueryClient) {
  const client = queryClient ?? createTestQueryClient()
  const router = createTestRouter()

  const result = render(
    <QueryClientProvider client={client}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  )

  return {
    ...result,
    queryClient: client,
    router,
  }
}
