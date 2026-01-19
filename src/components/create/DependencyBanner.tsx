import { AlertTriangle, ExternalLink, Settings, RefreshCw, CheckCircle2, Gamepad2, FolderOpen } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useDependencies } from '@/hooks/queries'
import { useSelectJdkPath, useSelectServerJarPath } from '@/hooks/mutations'

interface DependencyBannerProps {
  onOpenSettings?: () => void
}

export function DependencyBanner({ onOpenSettings }: DependencyBannerProps) {
  const { data: dependencies, isLoading, refetch } = useDependencies()
  const selectJdkPath = useSelectJdkPath()
  const selectServerJarPath = useSelectServerJarPath()

  if (isLoading) {
    return null
  }

  if (!dependencies || dependencies.canBuildPlugins) {
    return null
  }

  const { java, hytale } = dependencies
  const hasJavaIssue = java.status !== 'found'
  const hasHytaleIssue = hytale.status !== 'found'

  return (
    <div className="space-y-4 mb-6">
      {/* Java Dependency Banner */}
      {hasJavaIssue && (
        <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-yellow-500 flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <h3 className="font-medium text-sm text-yellow-600 dark:text-yellow-400">
                Java Development Kit Required
              </h3>
              <div className="mt-1 text-sm text-muted-foreground space-y-1">
                {java.issues.map((issue, i) => (
                  <p key={i}>{issue}</p>
                ))}
                {java.jdkPath && (
                  <p className="text-xs">
                    Detected path: <code className="bg-muted px-1 rounded">{java.jdkPath}</code>
                  </p>
                )}
              </div>

              {java.downloadInstructions && (
                <div className="mt-3 p-3 bg-muted/50 rounded-md text-xs whitespace-pre-wrap font-mono">
                  {java.downloadInstructions}
                </div>
              )}

              <div className="mt-3 flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  onClick={() => selectJdkPath.mutate()}
                  disabled={selectJdkPath.isPending}
                >
                  <Settings className="h-3.5 w-3.5" />
                  Select JDK Path
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-2"
                  onClick={() => refetch()}
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  Check Again
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-2"
                  asChild
                >
                  <a
                    href="https://adoptium.net/temurin/releases/?version=25"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    Download JDK
                  </a>
                </Button>
                {onOpenSettings && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="gap-2"
                    onClick={onOpenSettings}
                  >
                    <Settings className="h-3.5 w-3.5" />
                    Open Settings
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Hytale Dependency Banner */}
      {hasHytaleIssue && (
        <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-4">
          <div className="flex items-start gap-3">
            <Gamepad2 className="h-5 w-5 text-yellow-500 flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <h3 className="font-medium text-sm text-yellow-600 dark:text-yellow-400">
                HytaleServer.jar Required
              </h3>
              <div className="mt-1 text-sm text-muted-foreground space-y-1">
                {hytale.issues.map((issue, i) => (
                  <p key={i}>{issue}</p>
                ))}
                {hytale.hytalePath && (
                  <p className="text-xs">
                    Hytale path: <code className="bg-muted px-1 rounded">{hytale.hytalePath}</code>
                  </p>
                )}
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  onClick={() => selectServerJarPath.mutate()}
                  disabled={selectServerJarPath.isPending}
                >
                  <FolderOpen className="h-3.5 w-3.5" />
                  Select HytaleServer.jar
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-2"
                  onClick={() => refetch()}
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  Check Again
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export function DependencyStatus() {
  const { data: dependencies, isLoading } = useDependencies()

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <div className="w-3 h-3 border border-muted-foreground/30 border-t-muted-foreground rounded-full animate-spin" />
        Checking dependencies...
      </div>
    )
  }

  if (!dependencies) {
    return null
  }

  const { java, hytale } = dependencies
  const javaOk = java.status === 'found'
  const hytaleOk = hytale.status === 'found'

  // Show warning if either dependency is missing
  if (!javaOk || !hytaleOk) {
    const issues: string[] = []
    if (!javaOk) {
      issues.push(java.status === 'missing' ? 'Java not found' : `Java ${java.version} (upgrade needed)`)
    }
    if (!hytaleOk) {
      issues.push('Hytale not found')
    }

    return (
      <div className="flex items-center gap-2 text-xs text-yellow-600 dark:text-yellow-400">
        <AlertTriangle className="h-3.5 w-3.5" />
        {issues.join(', ')}
      </div>
    )
  }

  // All dependencies OK
  return (
    <div className="flex items-center gap-2 text-xs text-green-600 dark:text-green-400">
      <CheckCircle2 className="h-3.5 w-3.5" />
      Java {java.version}
    </div>
  )
}
