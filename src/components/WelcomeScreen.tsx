import { FolderOpen, Boxes, Sparkles, Shield, ArrowRight, Zap } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

// React Query hooks
import { useSelectInstallPath } from '@/hooks/mutations'

export function WelcomeScreen() {
  const selectInstallPath = useSelectInstallPath()

  const features = [
    {
      icon: Boxes,
      title: 'Manage Mods',
      description: 'Browse, enable, and organize your Hytale mods with a beautiful interface',
      color: 'from-blue-500/20 to-cyan-500/20',
      iconColor: 'text-blue-400',
    },
    {
      icon: Shield,
      title: 'Safe Profiles',
      description: 'Switch between mod configurations instantly with automatic backups',
      color: 'from-emerald-500/20 to-green-500/20',
      iconColor: 'text-emerald-400',
    },
    {
      icon: Sparkles,
      title: 'Create Content',
      description: 'Build new packs and plugins with guided wizards and templates',
      color: 'from-violet-500/20 to-purple-500/20',
      iconColor: 'text-violet-400',
    },
  ]

  const quickFeatures = [
    'Auto-detect installation',
    'Drag & drop load order',
    'One-click rollback',
    'Modpack sharing',
  ]

  return (
    <div className="flex min-h-[75vh] flex-col items-center justify-center py-8">
      {/* Hero Section */}
      <div className="mb-10 text-center">
        {/* Animated Logo */}
        <div className="relative mb-8 inline-block">
          <div className="absolute -inset-4 rounded-3xl bg-primary/20 blur-2xl" />
          <div className="relative flex h-24 w-24 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-primary/80 text-5xl font-bold text-primary-foreground shadow-2xl">
            H
          </div>
        </div>

        <h1 className="mb-4 text-5xl font-bold tracking-tight">
          Welcome to <span className="bg-gradient-to-r from-primary to-blue-400 bg-clip-text text-transparent">Hymn</span>
        </h1>
        <p className="mx-auto max-w-lg text-lg text-muted-foreground leading-relaxed">
          The modern mod manager for Hytale. Organize your mods, create profiles, and build your own content — all in one place.
        </p>
      </div>

      {/* Features Grid */}
      <div className="mb-10 grid w-full max-w-3xl gap-4 md:grid-cols-3">
        {features.map((feature, index) => {
          const Icon = feature.icon
          return (
            <div
              key={feature.title}
              className={cn(
                'group relative overflow-hidden rounded-2xl border border-border/50 bg-card p-6 transition-all duration-300',
                'hover:border-border hover:shadow-lg hover:shadow-black/20 hover:-translate-y-1'
              )}
              style={{ animationDelay: `${index * 100}ms` }}
            >
              {/* Gradient background */}
              <div className={cn('absolute inset-0 bg-gradient-to-br opacity-0 transition-opacity group-hover:opacity-100', feature.color)} />

              <div className="relative">
                <div className={cn(
                  'mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-muted/50 transition-colors group-hover:bg-muted',
                  feature.iconColor
                )}>
                  <Icon className="h-6 w-6" />
                </div>
                <h3 className="mb-2 text-lg font-semibold">{feature.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
              </div>
            </div>
          )
        })}
      </div>

      {/* CTA Section */}
      <div className="w-full max-w-md">
        <div className="rounded-2xl border border-border/50 bg-gradient-to-b from-card to-card/50 p-8 shadow-xl">
          <div className="mb-6 text-center">
            <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
              <Zap className="h-5 w-5 text-primary" />
            </div>
            <h2 className="mb-2 text-xl font-semibold">Get Started</h2>
            <p className="text-sm text-muted-foreground">
              Select your Hytale installation folder to begin
            </p>
          </div>

          <Button
            size="lg"
            onClick={() => selectInstallPath.mutate()}
            disabled={selectInstallPath.isPending}
            className="group w-full gap-2 h-12 text-base"
          >
            <FolderOpen className="h-5 w-5" />
            {selectInstallPath.isPending ? 'Scanning...' : 'Choose Hytale Folder'}
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Button>

          {/* Quick features list */}
          <div className="mt-6 grid grid-cols-2 gap-2">
            {quickFeatures.map((feature) => (
              <div key={feature} className="flex items-center gap-2 text-xs text-muted-foreground">
                <div className="h-1 w-1 rounded-full bg-primary" />
                {feature}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <p className="mt-8 text-xs text-muted-foreground/70">
        Hymn will automatically detect your Packs, Mods, and Plugins folders
      </p>
    </div>
  )
}
