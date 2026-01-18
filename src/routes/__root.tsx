import {useEffect} from 'react'
import {createRootRoute, Outlet, Link, useRouterState} from '@tanstack/react-router'
import {Boxes, Settings, Sparkles} from 'lucide-react'
import {TitleBar} from '@/components/ui/TitleBar'
import {cn} from '@/lib/utils'
import type {ThemeMode} from '@/shared/hymn-types'

const sections = [
    {
        to: '/' as const,
        label: 'Mods',
        description: 'Manage your mods present in your Hytale installation',
        icon: Boxes,
    },
    {
        to: '/create' as const,
        label: 'Create',
        description: 'Build new packs and plugins',
        icon: Sparkles,
    },
    {
        to: '/settings' as const,
        label: 'Settings',
        description: 'Configure paths and preferences',
        icon: Settings,
    },
]

function RootLayout() {
    const routerState = useRouterState()
    const currentPath = routerState.location.pathname

    // Initialize and listen for theme changes
    useEffect(() => {
        const applyTheme = (isDark: boolean) => {
            document.documentElement.classList.toggle('dark', isDark)
        }

        // Get initial theme and apply it
        const initTheme = async () => {
            const savedTheme = await window.hymnSettings.getTheme() as ThemeMode
            if (savedTheme === 'system') {
                const isDark = await window.hymnTheme.get()
                applyTheme(isDark)
            } else {
                applyTheme(savedTheme === 'dark')
            }
        }
        void initTheme()

        // Listen for OS theme changes (when set to system)
        return window.hymnTheme.onChange(async (isDark) => {
            const currentTheme = await window.hymnSettings.getTheme() as ThemeMode
            if (currentTheme === 'system') {
                applyTheme(isDark)
            }
        })
    }, [])

    // Find active section meta for header
    const activeSectionMeta = sections.find((section) => {
        if (section.to === '/') {
            return currentPath === '/'
        }
        return currentPath.startsWith(section.to)
    }) ?? sections[0]

    return (
        <div className="flex h-screen flex-col bg-background text-foreground">
            {/* Custom Titlebar */}
            <TitleBar/>

            {/* Main app content */}
            <div className="relative flex flex-1 overflow-hidden">
                {/* Sidebar Navigation */}
                <aside
                    className="flex w-16 flex-col items-center border-r border-border/30 bg-sidebar/80 backdrop-blur-sm py-4">
                    {/* Navigation Items */}
                    <nav className="flex flex-1 flex-col items-center gap-2">
                        {sections.map((section) => {
                            const Icon = section.icon
                            const isActive = section.to === '/'
                                ? currentPath === '/'
                                : currentPath.startsWith(section.to)

                            return (
                                <Link
                                    key={section.to}
                                    to={section.to}
                                    className={cn(
                                        'group relative flex h-11 w-11 items-center justify-center rounded-xl transition-all duration-200',
                                        isActive
                                            ? 'bg-primary text-primary-foreground shadow-lg'
                                            : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
                                    )}
                                    title={section.label}
                                >
                                    <Icon className="h-5 w-5"/>
                                    {/* Tooltip */}
                                    <span
                                        className="absolute left-full ml-3 hidden whitespace-nowrap rounded-lg bg-popover px-3 py-1.5 text-xs font-medium text-popover-foreground shadow-lg border border-border/50 group-hover:block z-50">
                    {section.label}
                  </span>
                                </Link>
                            )
                        })}
                    </nav>
                </aside>

                {/* Main Content */}
                <main className="flex flex-1 flex-col overflow-hidden">

                    <>
                        {/* Header */}
                        <header
                            className="flex items-center border-b border-border/30 bg-card/30 backdrop-blur-sm px-8 py-4">
                            <div>
                                <h1 className="text-xl font-semibold">{activeSectionMeta.label}</h1>
                                <p className="text-sm text-muted-foreground">{activeSectionMeta.description}</p>
                            </div>
                        </header>

                        {/* Content Area */}
                        <div className="flex-1 overflow-auto">
                            <div className="mx-auto w-full max-w-7xl px-8 py-6">
                                <Outlet/>
                            </div>
                        </div>
                    </>
                </main>
            </div>
        </div>
    )
}

export const Route = createRootRoute({
    component: RootLayout,
})
