import { useEffect } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { ModsSection } from '@/components/sections/ModsSection'
import { useInstallInfo } from '@/hooks/queries'

export const Route = createFileRoute('/')({
  component: ModsPage,
})

function ModsPage() {
  const navigate = useNavigate()
  const { data: installInfo } = useInstallInfo()
  const hasInstall = !!installInfo?.activePath

  // Redirect to settings if no install path is configured
  useEffect(() => {
    if (installInfo !== undefined && !hasInstall) {
      navigate({ to: '/settings' })
    }
  }, [installInfo, hasInstall, navigate])

  // Show nothing while checking or redirecting
  if (!hasInstall) {
    return null
  }

  return <ModsSection />
}
