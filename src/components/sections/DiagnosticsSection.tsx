import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useAppContext } from '@/context/AppContext'

export function DiagnosticsSection() {
  const { state } = useAppContext()
  const { installInfo } = state

  const installIssues = installInfo?.issues ?? []

  return (
    <>
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold">Diagnostics</h1>
        <p className="text-sm text-muted-foreground">
          Review install health and profile conflicts.
        </p>
      </header>
      <div className="grid gap-4 md:grid-cols-1">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Install health</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={installInfo?.activePath ? 'secondary' : 'destructive'}>
                {installInfo?.activePath ? 'Detected' : 'Missing'}
              </Badge>
              <span className="text-muted-foreground">Active path</span>
            </div>
            <p className="font-mono text-xs text-muted-foreground">
              {installInfo?.activePath ?? 'No install detected. Choose a folder to continue.'}
            </p>
            {installIssues.length ? (
              <div className="rounded-lg border border-dashed border-border/60 bg-muted/30 p-3 text-xs">
                <p className="font-medium text-muted-foreground">Install issues</p>
                <ul className="mt-2 space-y-1 text-muted-foreground">
                  {installIssues.map((issue) => (
                    <li key={issue} className="leading-relaxed">
                      {issue}
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">No install issues detected.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  )
}
