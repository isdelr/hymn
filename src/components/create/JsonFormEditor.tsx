import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Save, RefreshCw, FileCode, Beaker } from 'lucide-react'
import { Textarea } from '@/components/ui/textarea'

interface JsonFormEditorProps {
    filePath: string
    onSave: (content: string) => Promise<void>
    initialMode?: 'visual' | 'code'
}

export function JsonFormEditor({ filePath, onSave, initialMode = 'visual' }: JsonFormEditorProps) {
    const [content, setContent] = useState<string>('')
    const [isLoading, setIsLoading] = useState(true)
    const [isSaving, setIsSaving] = useState(false)
    const [mode, setMode] = useState<'visual' | 'code'>(initialMode)

    const loadFile = async () => {
        setIsLoading(true)
        try {
            const data = await window.hymn.readFile(filePath)
            setContent(data)
        } catch (error) {
            console.error('Failed to load file:', error)
        } finally {
            setIsLoading(false)
        }
    }

    useEffect(() => {
        loadFile()
    }, [filePath])

    const handleSave = async () => {
        setIsSaving(true)
        try {
            await onSave(content)
        } finally {
            setIsSaving(false)
        }
    }

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center h-full p-12 text-muted-foreground">
                <RefreshCw className="h-8 w-8 animate-spin mb-4" />
                <p>Loading asset...</p>
            </div>
        )
    }

    return (
        <div className="flex flex-col h-full animate-in fade-in duration-500 overflow-hidden">
            <div className="flex-1 flex flex-col overflow-hidden">
                {mode === 'code' ? (
                    <div className="flex-1 flex flex-col p-4 bg-muted/20 rounded-xl border font-mono">
                        <Textarea
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            className="flex-1 resize-none bg-transparent border-none focus-visible:ring-0 text-sm font-mono leading-relaxed"
                            placeholder="{ ... }"
                        />
                    </div>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center p-12 text-center bg-card/50 rounded-xl border border-dashed">
                        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                            <Beaker className="h-8 w-8 text-primary" />
                        </div>
                        <h3 className="text-lg font-bold">Dynamic Visual Editor</h3>
                        <p className="text-sm text-muted-foreground max-w-sm mb-6">
                            We are currently building specialized editors for different Hytale asset types (Blocks, Items, etc.).
                            Switch to Code mode for manual JSON editing.
                        </p>
                        <Button variant="outline" onClick={() => setMode('code')} className="gap-2">
                            <FileCode className="h-4 w-4" />
                            Edit Source
                        </Button>
                    </div>
                )}
            </div>

            <div className="flex justify-end gap-3 pt-6">
                <Button variant="ghost" onClick={() => setMode(mode === 'visual' ? 'code' : 'visual')}>
                    {mode === 'visual' ? 'Show Code' : 'Show Visual'}
                </Button>
                <Button onClick={handleSave} disabled={isSaving} className="gap-2 px-8">
                    <Save className="h-4 w-4" />
                    {isSaving ? 'Saving...' : 'Save Changes'}
                </Button>
            </div>
        </div>
    )
}
