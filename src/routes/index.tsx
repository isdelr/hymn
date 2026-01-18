import { createFileRoute } from '@tanstack/react-router'
import { ModsSection } from '@/components/sections/ModsSection'

export const Route = createFileRoute('/')({
  component: ModsPage,
})

function ModsPage() {
  return <ModsSection />
}
