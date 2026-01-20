import { useEffect } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { Loader2 } from 'lucide-react'
import { ModsSection } from '@/components/sections/ModsSection'
import { useInstallInfo } from '@/hooks/queries'

export const Route = createFileRoute('/')({
  component: ModsPage,
})

function ModsPage() {
  const navigate = useNavigate()
  const { data: installInfo, isLoading } = useInstallInfo()
  const hasInstall = !!installInfo?.activePath

  // Redirect to settings if no install path is configured
  useEffect(() => {
    if (installInfo !== undefined && !hasInstall) {
      navigate({ to: '/settings' })
    }
  }, [installInfo, hasInstall, navigate])

  // Show loading spinner while fetching install info
  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  // Show nothing while redirecting (after loading completes)
  if (!hasInstall) {
    return null
  }

  return <ModsSection />
}
