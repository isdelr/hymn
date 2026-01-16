import { useEffect, useState } from 'react'
import { PackManifest } from '@/shared/hymn-types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Save, RefreshCw } from 'lucide-react'

interface ManifestEditorProps {
    filePath: string
    onSave: (content: string) => Promise<void>
}

export function ManifestEditor({ filePath, onSave }: ManifestEditorProps) {
    const [manifest, setManifest] = useState<PackManifest | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [isSaving, setIsSaving] = useState(false)

    const loadManifest = async () => {
        setIsLoading(true)
        try {
            const content = await window.hymn.readFile(filePath)
            setManifest(JSON.parse(content))
        } catch (error) {
            console.error('Failed to load manifest:', error)
        } finally {
            setIsLoading(false)
        }
    }

    useEffect(() => {
        loadManifest()
    }, [filePath])

    const handleUpdate = (updates: Partial<PackManifest>) => {
        if (!manifest) return
        setManifest({ ...manifest, ...updates })
    }

    const handleSave = async () => {
        if (!manifest) return
        setIsSaving(true)
        try {
            await onSave(JSON.stringify(manifest, null, 2))
        } finally {
            setIsSaving(false)
        }
    }

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center h-full p-12 text-muted-foreground">
                <RefreshCw className="h-8 w-8 animate-spin mb-4" />
                <p>Reading manifest data...</p>
            </div>
        )
    }

    if (!manifest) {
        return (
            <div className="p-8 text-center text-destructive">
                Failed to load manifest data.
            </div>
        )
    }

    return (
        <div className="space-y-8 animate-in fade-in duration-500 max-w-2xl mx-auto">
            <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                    <Label>Mod Name</Label>
                    <Input
                        value={manifest.Name || ''}
                        onChange={(e) => handleUpdate({ Name: e.target.value })}
                    />
                </div>
                <div className="space-y-2">
                    <Label>Group</Label>
                    <Input
                        value={manifest.Group || ''}
                        onChange={(e) => handleUpdate({ Group: e.target.value })}
                    />
                </div>
            </div>

            <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                    <Label>Version</Label>
                    <Input
                        value={manifest.Version || ''}
                        onChange={(e) => handleUpdate({ Version: e.target.value })}
                    />
                </div>
                <div className="space-y-2">
                    <Label>Website</Label>
                    <Input
                        value={manifest.Website || ''}
                        onChange={(e) => handleUpdate({ Website: e.target.value })}
                    />
                </div>
            </div>

            <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                    value={manifest.Description || ''}
                    onChange={(e) => handleUpdate({ Description: e.target.value })}
                    rows={4}
                />
            </div>

            <div className="flex justify-end pt-4">
                <Button onClick={handleSave} disabled={isSaving} className="gap-2 px-8">
                    <Save className="h-4 w-4" />
                    {isSaving ? 'Saving...' : 'Save Manifest'}
                </Button>
            </div>
        </div>
    )
}
