import { useMemo, useState } from 'react'
import { Boxes, Settings, Sparkles } from 'lucide-react'
import { AppProvider, useAppContext } from '@/context/AppContext'
import { ModsSection } from '@/components/sections/ModsSection'
import { CreateSection } from '@/components/sections/CreateSection'
import { SettingsSection } from '@/components/sections/SettingsSection'
import { WelcomeScreen } from '@/components/WelcomeScreen'
import { TitleBar } from '@/components/ui/TitleBar'
import { cn } from '@/lib/utils'

const sections = [
  {
    id: 'mods',
    label: 'Mods',
    description: 'Manage your mods and profiles',
    icon: Boxes,
  },
  {
    id: 'create',
    label: 'Create',
    description: 'Build new packs and plugins',
    icon: Sparkles,
  },
  {
    id: 'settings',
    label: 'Settings',
    description: 'Configure paths and preferences',
    icon: Settings,
  },
] as const

type AppSection = (typeof sections)[number]['id']

function AppContent() {
  const { state } = useAppContext()
  const { installInfo } = state
  const [activeSection, setActiveSection] = useState<AppSection>('mods')

  const activeSectionMeta = useMemo(() => {
    return sections.find((section) => section.id === activeSection) ?? sections[0]
  }, [activeSection])

  // Show welcome screen if no install path is configured
  const showWelcome = !installInfo?.activePath

  const sectionContent = (() => {
    if (showWelcome) {
      return <WelcomeScreen />
    }
    switch (activeSection) {
      case 'create':
        return <CreateSection />
      case 'settings':
        return <SettingsSection />
      default:
        return <ModsSection />
    }
  })()

  return (
    <div className="flex h-screen flex-col bg-background text-foreground">
      {/* Custom Titlebar */}
      <TitleBar />

      {/* Main app content */}
      <div className="relative flex flex-1 overflow-hidden">
        {/* Sidebar Navigation */}
        <aside className="flex w-16 flex-col items-center border-r border-border/30 bg-sidebar/80 backdrop-blur-sm py-4">
          {/* Navigation Items */}
          <nav className="flex flex-1 flex-col items-center gap-2">
            {sections.map((section) => {
              const Icon = section.icon
              const isActive = activeSection === section.id
              return (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  disabled={showWelcome && section.id !== 'settings'}
                  className={cn(
                    'group relative flex h-11 w-11 items-center justify-center rounded-xl transition-all duration-200',
                    isActive
                      ? 'bg-primary text-primary-foreground shadow-lg'
                      : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
                    showWelcome && section.id !== 'settings' && 'opacity-40 cursor-not-allowed'
                  )}
                  title={section.label}
                >
                  <Icon className="h-5 w-5" />
                  {/* Tooltip */}
                  <span className="absolute left-full ml-3 hidden whitespace-nowrap rounded-lg bg-popover px-3 py-1.5 text-xs font-medium text-popover-foreground shadow-lg border border-border/50 group-hover:block z-50">
                    {section.label}
                  </span>
                </button>
              )
            })}
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex flex-1 flex-col overflow-hidden">
          {/* Header */}
          {!showWelcome && (
            <header className="flex items-center border-b border-border/30 bg-card/30 backdrop-blur-sm px-8 py-4">
              <div>
                <h1 className="text-xl font-semibold">{activeSectionMeta.label}</h1>
                <p className="text-sm text-muted-foreground">{activeSectionMeta.description}</p>
              </div>
            </header>
          )}

          {/* Content Area */}
          <div className="flex-1 overflow-auto">
            <div className={cn(
              'mx-auto w-full px-8 py-6',
              showWelcome ? 'max-w-3xl' : 'max-w-7xl'
            )}>
              {sectionContent}
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}

function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  )
}

export default App
