import { useState, useEffect, useCallback } from 'react'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Loader2 } from 'lucide-react'
import type { PackManifest } from '@/shared/hymn-types'

interface ProjectSettingsDialogProps {
    isOpen: boolean
    onClose: () => void
    projectPath: string
    projectFormat: 'directory' | 'zip' | 'jar'
    onSaved?: () => void
}

export function ProjectSettingsDialog({
    isOpen,
    onClose,
    projectPath,
    projectFormat,
    onSaved,
}: ProjectSettingsDialogProps) {
    const [manifest, setManifest] = useState<PackManifest | null>(null)
    const [isLoading, setIsLoading] = useState(false)
    const [isSaving, setIsSaving] = useState(false)
    const [error, setError] = useState<string | null>(null)

    // Load manifest when dialog opens
    useEffect(() => {
        if (isOpen && projectPath) {
            loadManifest()
        }
    }, [isOpen, projectPath])

    const loadManifest = async () => {
        setIsLoading(true)
        setError(null)
        try {
            const result = await window.hymn.getModManifest({
                path: projectPath,
                format: projectFormat,
            })
            if (result.content) {
                setManifest(JSON.parse(result.content))
            } else {
                setError('Could not load project manifest')
            }
        } catch (err) {
            console.error('Failed to load manifest:', err)
            setError('Failed to load project settings')
        } finally {
            setIsLoading(false)
        }
    }

    const handleUpdate = (updates: Partial<PackManifest>) => {
        if (!manifest) return
        setManifest({ ...manifest, ...updates })
    }

    const handleSave = async () => {
        if (!manifest) return
        setIsSaving(true)
        try {
            await window.hymn.saveModManifest({
                path: projectPath,
                format: projectFormat,
                content: JSON.stringify(manifest, null, 2),
            })
            onSaved?.()
            onClose()
        } catch (err) {
            console.error('Failed to save manifest:', err)
            setError('Failed to save project settings')
        } finally {
            setIsSaving(false)
        }
    }

    const handleClose = () => {
        setManifest(null)
        setError(null)
        onClose()
    }

    return (
        <Dialog open={isOpen} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-[500px] border-border/80 bg-card">
                <DialogHeader>
                    <DialogTitle>Project Settings</DialogTitle>
                    <DialogDescription>
                        Edit your project's metadata and configuration.
                    </DialogDescription>
                </DialogHeader>

                {isLoading ? (
                    <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                ) : error ? (
                    <div className="py-8 text-center text-destructive text-sm">
                        {error}
                    </div>
                ) : manifest ? (
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="project-name">Name</Label>
                                <Input
                                    id="project-name"
                                    value={manifest.Name || ''}
                                    onChange={(e) => handleUpdate({ Name: e.target.value })}
                                    placeholder="My Mod"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="project-version">Version</Label>
                                <Input
                                    id="project-version"
                                    value={manifest.Version || ''}
                                    onChange={(e) => handleUpdate({ Version: e.target.value })}
                                    placeholder="1.0.0"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="project-group">Group</Label>
                                <Input
                                    id="project-group"
                                    value={manifest.Group || ''}
                                    onChange={(e) => handleUpdate({ Group: e.target.value })}
                                    placeholder="com.example"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="project-website">Website</Label>
                                <Input
                                    id="project-website"
                                    value={manifest.Website || ''}
                                    onChange={(e) => handleUpdate({ Website: e.target.value })}
                                    placeholder="https://..."
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="project-description">Description</Label>
                            <Textarea
                                id="project-description"
                                value={manifest.Description || ''}
                                onChange={(e) => handleUpdate({ Description: e.target.value })}
                                placeholder="A short description of your mod..."
                                rows={3}
                            />
                        </div>

                        {manifest.Authors && manifest.Authors.length > 0 && (
                            <div className="space-y-2">
                                <Label htmlFor="project-author">Author</Label>
                                <Input
                                    id="project-author"
                                    value={manifest.Authors[0]?.Name || ''}
                                    onChange={(e) => handleUpdate({
                                        Authors: [{ ...manifest.Authors?.[0], Name: e.target.value }]
                                    })}
                                    placeholder="Your name"
                                />
                            </div>
                        )}
                    </div>
                ) : null}

                <DialogFooter>
                    <Button variant="ghost" onClick={handleClose}>
                        Cancel
                    </Button>
                    <Button
                        onClick={handleSave}
                        disabled={isSaving || isLoading || !manifest}
                    >
                        {isSaving ? (
                            <>
                                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                Saving...
                            </>
                        ) : (
                            'Save Changes'
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
