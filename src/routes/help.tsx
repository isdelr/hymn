import { createFileRoute } from '@tanstack/react-router'
import { HelpSection } from '@/components/sections/HelpSection'

export const Route = createFileRoute('/help')({
  component: HelpPage,
})

function HelpPage() {
  return <HelpSection />
}
