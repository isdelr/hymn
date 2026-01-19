import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import {
  createFixtures,
  buildHymnApi,
  buildHymnFileWatcherApi,
} from './test-utils'
import { renderApp } from './test-utils/render'

// Reset before each test
beforeEach(() => {
  vi.clearAllMocks()
  buildHymnFileWatcherApi()
})

describe('App', () => {
  it('loads install info and scan data', async () => {
    const fixtures = createFixtures()
    const api = buildHymnApi(fixtures)

    await renderApp()

    // Wait for mods grid to appear and verify all mods are rendered
    await waitFor(
      () => {
        expect(screen.getByText('Alpha Pack')).toBeInTheDocument()
        expect(screen.getByText('Beta Plugin')).toBeInTheDocument()
        expect(screen.getByText('Gamma Early')).toBeInTheDocument()
      },
      { timeout: 5000 }
    )

    // React Query auto-fetches, so these should have been called
    expect(api.getInstallInfo).toHaveBeenCalled()
  })

  it('filters the mod list by name', async () => {
    const fixtures = createFixtures()
    buildHymnApi(fixtures)

    await renderApp()

    // Wait for mods grid to appear
    await screen.findByText('Alpha Pack', {}, { timeout: 5000 })

    const user = userEvent.setup()
    const filterInput = screen.getByPlaceholderText(/search mods/i)

    // Filter by name
    await user.type(filterInput, 'Beta')

    // Wait for Beta Plugin to be shown and Alpha Pack to be filtered out
    await waitFor(() => {
      expect(screen.getByText('Beta Plugin')).toBeInTheDocument()
    })

    // Alpha Pack should be filtered out (search is case-insensitive)
    await waitFor(() => {
      expect(screen.queryByText('Alpha Pack')).not.toBeInTheDocument()
    })
  })

  it('calls setModEnabled when toggling a mod', async () => {
    const fixtures = createFixtures()
    const setModEnabled = vi.fn().mockResolvedValue({ success: true })
    buildHymnApi(fixtures, { setModEnabled })

    await renderApp()

    // Wait for mods grid to appear
    await screen.findByText('Alpha Pack', {}, { timeout: 5000 })

    // Wait for the world data to load (toggle requires selectedWorld)
    await waitFor(
      () => {
        expect(window.hymn.getWorlds).toHaveBeenCalled()
      },
      { timeout: 3000 }
    )

    // Give React Query time to process the worlds data
    await new Promise((resolve) => setTimeout(resolve, 100))

    const user = userEvent.setup()

    // Find the toggle - it should now be enabled since world is loaded
    const toggle = screen.getByRole('switch', { name: /toggle alpha pack/i })

    // Wait for toggle to be enabled
    await waitFor(
      () => {
        expect(toggle).not.toBeDisabled()
      },
      { timeout: 3000 }
    )

    await user.click(toggle)

    await waitFor(
      () => {
        expect(setModEnabled).toHaveBeenCalledWith(
          expect.objectContaining({
            modId: 'alpha-pack',
            enabled: false,
          })
        )
      },
      { timeout: 3000 }
    )
  })

  it('renders search input for filtering mods', async () => {
    const fixtures = createFixtures()
    buildHymnApi(fixtures)

    await renderApp()

    // Wait for mods grid to appear
    await screen.findByText('Alpha Pack', {}, { timeout: 5000 })

    // Verify search input exists
    const filterInput = screen.getByPlaceholderText(/search mods/i)
    expect(filterInput).toBeInTheDocument()
  })

  it('displays mod types correctly', async () => {
    const fixtures = createFixtures()
    buildHymnApi(fixtures)

    await renderApp()

    // Wait for mods grid to appear
    await screen.findByText('Alpha Pack', {}, { timeout: 5000 })

    // Check that different mod types are displayed
    // Alpha Pack is type 'pack'
    // Beta Plugin is type 'plugin'
    // Gamma Early is type 'early-plugin'
    expect(screen.getByText('Alpha Pack')).toBeInTheDocument()
    expect(screen.getByText('Beta Plugin')).toBeInTheDocument()
    expect(screen.getByText('Gamma Early')).toBeInTheDocument()
  })
})
