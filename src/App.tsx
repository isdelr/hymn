import { useMemo, useState } from 'react'
import { Activity, LayoutGrid, Settings, Sparkles, Users } from 'lucide-react'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  SidebarSeparator,
  SidebarTrigger,
} from '@/components/ui/sidebar'
import { AppProvider, useAppContext } from '@/context/AppContext'
import {
  LibrarySection,
  ProfilesSection,
  CreateSection,
  DiagnosticsSection,
  SettingsSection,
} from '@/components/sections'

const sections = [
  {
    id: 'library',
    label: 'Library',
    description: 'Scan mods and review metadata.',
    icon: LayoutGrid,
  },
  {
    id: 'profiles',
    label: 'Profiles',
    description: 'Curate mod sets and load order.',
    icon: Users,
  },
  {
    id: 'create',
    label: 'Create',
    description: 'Scaffold packs and manifests.',
    icon: Sparkles,
  },
  {
    id: 'diagnostics',
    label: 'Diagnostics',
    description: 'Check warnings and install health.',
    icon: Activity,
  },
  {
    id: 'settings',
    label: 'Settings',
    description: 'Manage paths and preferences.',
    icon: Settings,
  },
] as const

type AppSection = (typeof sections)[number]['id']

function AppContent() {
  const { state } = useAppContext()
  const { installInfo } = state
  const [activeSection, setActiveSection] = useState<AppSection>('library')

  const activeSectionMeta = useMemo(() => {
    return sections.find((section) => section.id === activeSection) ?? sections[0]
  }, [activeSection])

  const sectionContent = (() => {
    switch (activeSection) {
      case 'profiles':
        return <ProfilesSection />
      case 'create':
        return <CreateSection />
      case 'diagnostics':
        return <DiagnosticsSection />
      case 'settings':
        return <SettingsSection />
      default:
        return <LibrarySection />
    }
  })()

  return (
    <SidebarProvider className="bg-background text-foreground">
      <Sidebar variant="inset" collapsible="icon">
        <SidebarHeader className="pt-3">
          <div className="flex items-center gap-3 px-2">
            <div className="flex size-9 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground text-sm font-semibold">
              H
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-semibold">Hymn</span>
              <span className="text-xs text-sidebar-foreground/70">Mod Manager</span>
            </div>
          </div>
        </SidebarHeader>
        <SidebarSeparator />
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Workspace</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {sections.map((section) => {
                  const Icon = section.icon
                  return (
                    <SidebarMenuItem key={section.id}>
                      <SidebarMenuButton
                        isActive={activeSection === section.id}
                        onClick={() => setActiveSection(section.id)}
                        tooltip={section.label}
                      >
                        <Icon />
                        <span>{section.label}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  )
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
        <SidebarSeparator />
        <SidebarFooter className="group-data-[collapsible=icon]:hidden">
          <div className="rounded-lg bg-sidebar-accent/40 p-2 text-xs text-sidebar-foreground/70">
            <p className="text-[11px] uppercase tracking-[0.2em] text-sidebar-foreground/60">Install</p>
            <p className="mt-1 truncate text-xs text-sidebar-foreground">
              {installInfo?.activePath ?? 'Not configured'}
            </p>
          </div>
        </SidebarFooter>
      </Sidebar>
      <SidebarRail />
      <SidebarInset>
        <div className="flex items-center gap-3 border-b border-border/60 px-6 py-4">
          <SidebarTrigger />
          <div className="flex flex-col">
            <span className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Hymn</span>
            <span className="text-sm font-medium">{activeSectionMeta.label}</span>
          </div>
          <span className="ml-auto hidden text-xs text-muted-foreground lg:block">
            {activeSectionMeta.description}
          </span>
        </div>
        <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-6 py-8">
          {sectionContent}
        </div>
      </SidebarInset>
    </SidebarProvider>
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
