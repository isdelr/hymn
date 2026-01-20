import { useState, useEffect, useCallback } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
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
import { Textarea } from '@/components/ui/textarea'
import { Loader2 } from 'lucide-react'
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form'
import type { PackManifest } from '@/shared/hymn-types'

const formSchema = z.object({
    name: z.string().min(1, 'Name is required'),
    version: z.string().min(1, 'Version is required'),
    group: z.string().optional(),
    website: z.string().optional(),
    description: z.string().optional(),
    authorName: z.string().optional(),
})

type FormData = z.infer<typeof formSchema>

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
    const [originalManifest, setOriginalManifest] = useState<PackManifest | null>(null)
    const [isLoading, setIsLoading] = useState(false)
    const [isSaving, setIsSaving] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const form = useForm<FormData>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            name: '',
            version: '',
            group: '',
            website: '',
            description: '',
            authorName: '',
        },
        mode: 'onChange',
    })

    const loadManifest = useCallback(async () => {
        setIsLoading(true)
        setError(null)
        try {
            const result = await window.hymn.getModManifest({
                path: projectPath,
                format: projectFormat,
            })
            if (result.content) {
                const manifest = JSON.parse(result.content) as PackManifest
                setOriginalManifest(manifest)
                form.reset({
                    name: manifest.Name || '',
                    version: manifest.Version || '',
                    group: manifest.Group || '',
                    website: manifest.Website || '',
                    description: manifest.Description || '',
                    authorName: manifest.Authors?.[0]?.Name || '',
                })
            } else {
                setError('Could not load project manifest')
            }
        } catch (err) {
            console.error('Failed to load manifest:', err)
            setError('Failed to load project settings')
        } finally {
            setIsLoading(false)
        }
    }, [projectPath, projectFormat, form])

    // Load manifest when dialog opens
    useEffect(() => {
        if (isOpen && projectPath) {
            loadManifest()
        }
    }, [isOpen, projectPath, loadManifest])

    const handleSubmit = async (data: FormData) => {
        if (!originalManifest) return
        setIsSaving(true)
        try {
            const updatedManifest: PackManifest = {
                ...originalManifest,
                Name: data.name,
                Version: data.version,
                Group: data.group || undefined,
                Website: data.website || undefined,
                Description: data.description || undefined,
                Authors: data.authorName
                    ? [{ ...originalManifest.Authors?.[0], Name: data.authorName }]
                    : originalManifest.Authors,
            }
            await window.hymn.saveModManifest({
                path: projectPath,
                format: projectFormat,
                content: JSON.stringify(updatedManifest, null, 2),
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
        setOriginalManifest(null)
        setError(null)
        form.reset()
        onClose()
    }

    const hasAuthors = originalManifest?.Authors && originalManifest.Authors.length > 0

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
                ) : originalManifest ? (
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(handleSubmit)}>
                            <div className="grid gap-4 py-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <FormField
                                        control={form.control}
                                        name="name"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Name</FormLabel>
                                                <FormControl>
                                                    <Input placeholder="My Mod" {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="version"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Version</FormLabel>
                                                <FormControl>
                                                    <Input placeholder="1.0.0" {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <FormField
                                        control={form.control}
                                        name="group"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Group</FormLabel>
                                                <FormControl>
                                                    <Input placeholder="com.example" {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="website"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Website</FormLabel>
                                                <FormControl>
                                                    <Input placeholder="https://..." {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>

                                <FormField
                                    control={form.control}
                                    name="description"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Description</FormLabel>
                                            <FormControl>
                                                <Textarea
                                                    placeholder="A short description of your mod..."
                                                    rows={3}
                                                    {...field}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                {hasAuthors && (
                                    <FormField
                                        control={form.control}
                                        name="authorName"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Author</FormLabel>
                                                <FormControl>
                                                    <Input placeholder="Your name" {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                )}
                            </div>

                            <DialogFooter>
                                <Button type="button" variant="ghost" onClick={handleClose}>
                                    Cancel
                                </Button>
                                <Button
                                    type="submit"
                                    disabled={isSaving || !form.formState.isValid}
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
                        </form>
                    </Form>
                ) : null}

                {!originalManifest && !isLoading && !error && (
                    <DialogFooter>
                        <Button variant="ghost" onClick={handleClose}>
                            Cancel
                        </Button>
                    </DialogFooter>
                )}
            </DialogContent>
        </Dialog>
    )
}
