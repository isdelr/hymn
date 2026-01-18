import { useEffect, useState, useCallback, useRef } from 'react'
import Editor from '@monaco-editor/react'
import { JavaSourceFile } from '@/shared/hymn-types'
import { Button } from '@/components/ui/button'
import { Save, RefreshCw, FileCode, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useMonacoTheme } from '@/hooks/useMonacoTheme'
import { useDirtyFilesStore } from '@/stores'

interface JavaFileEditorProps {
    file: JavaSourceFile | null
    onSave: (content: string) => Promise<void>
    onClose: () => void
}

export function JavaFileEditor({ file, onSave, onClose }: JavaFileEditorProps) {
    const [content, setContent] = useState<string>('')
    const [originalContent, setOriginalContent] = useState<string>('')
    const [isLoading, setIsLoading] = useState(false)
    const [isSaving, setIsSaving] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const { theme: monacoTheme } = useMonacoTheme()
    const setDirtyFile = useDirtyFilesStore((s) => s.setDirtyFile)
    const clearDirtyFile = useDirtyFilesStore((s) => s.clearDirtyFile)
    const getDirtyContent = useDirtyFilesStore((s) => s.getDirtyContent)

    const isDirty = content !== originalContent

    const loadFile = useCallback(async () => {
        if (!file) return

        setIsLoading(true)
        setError(null)
        try {
            // Check if we have unsaved changes for this file
            const dirtyContent = getDirtyContent(file.absolutePath)

            // Always load the original from disk
            const data = await window.hymn.readFile(file.absolutePath)
            setOriginalContent(data)

            // Use dirty content if available, otherwise use disk content
            if (dirtyContent !== undefined) {
                setContent(dirtyContent)
            } else {
                setContent(data)
            }
        } catch (err) {
            console.error('Failed to load file:', file?.absolutePath, err)
            setError(`Failed to load file: ${err instanceof Error ? err.message : 'Unknown error'}`)
        } finally {
            setIsLoading(false)
        }
    }, [file, getDirtyContent])

    useEffect(() => {
        loadFile()
    }, [loadFile])

    // Update dirty files context when content changes
    useEffect(() => {
        if (file && originalContent) {
            setDirtyFile(file.absolutePath, content, originalContent)
        }
    }, [file, content, originalContent, setDirtyFile])

    const handleSave = async () => {
        if (!file) return

        setIsSaving(true)
        try {
            await onSave(content)
            setOriginalContent(content)
            clearDirtyFile(file.absolutePath)
        } catch (err) {
            console.error('Failed to save file:', err)
            setError('Failed to save file')
        } finally {
            setIsSaving(false)
        }
    }

    const handleDiscard = () => {
        if (file) {
            setContent(originalContent)
            clearDirtyFile(file.absolutePath)
        }
    }

    // Keep a ref to handleSave for the keyboard shortcut effect
    const handleSaveRef = useRef(handleSave)
    handleSaveRef.current = handleSave

    // Handle keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                e.preventDefault()
                if (isDirty) {
                    handleSaveRef.current()
                }
            }
        }
        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [isDirty])

    if (!file) {
        return (
            <div className="flex flex-col items-center justify-center h-full p-12 text-center">
                <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                    <FileCode className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-bold">No File Selected</h3>
                <p className="text-sm text-muted-foreground max-w-sm">
                    Select a Java file from the sidebar to edit, or create a new class.
                </p>
            </div>
        )
    }

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center h-full p-12 text-muted-foreground">
                <RefreshCw className="h-8 w-8 animate-spin mb-4" />
                <p>Loading {file.name}...</p>
            </div>
        )
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center h-full p-12 text-center">
                <div className="text-destructive mb-4">{error}</div>
                <Button variant="outline" onClick={loadFile}>
                    Try Again
                </Button>
            </div>
        )
    }

    return (
        <div className="flex flex-col h-full">
            {/* File Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b bg-card/50">
                <div className="flex items-center gap-3">
                    <FileCode className="h-5 w-5 text-primary" />
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="font-semibold">{file.className}</span>
                            {isDirty && (
                                <span className="w-2 h-2 rounded-full bg-amber-500" title="Unsaved changes" />
                            )}
                        </div>
                        <span className="text-xs text-muted-foreground font-mono">
                            {file.packageName}
                        </span>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {isDirty && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleDiscard}
                            className="text-muted-foreground"
                        >
                            Discard
                        </Button>
                    )}
                    <Button
                        variant={isDirty ? 'default' : 'outline'}
                        size="sm"
                        onClick={handleSave}
                        disabled={isSaving || !isDirty}
                        className="gap-2"
                    >
                        <Save className="h-4 w-4" />
                        {isSaving ? 'Saving...' : 'Save'}
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={onClose}
                        className="h-8 w-8"
                    >
                        <X className="h-4 w-4" />
                    </Button>
                </div>
            </div>

            {/* Editor */}
            <div className="flex-1 overflow-hidden">
                <Editor
                    height="100%"
                    language="java"
                    theme={monacoTheme}
                    value={content}
                    onChange={(value) => setContent(value || '')}
                    options={{
                        fontSize: 14,
                        fontFamily: 'JetBrains Mono, Consolas, monospace',
                        minimap: { enabled: false },
                        scrollBeyondLastLine: false,
                        lineNumbers: 'on',
                        renderLineHighlight: 'line',
                        wordWrap: 'off',
                        tabSize: 4,
                        insertSpaces: true,
                        automaticLayout: true,
                        padding: { top: 16, bottom: 16 },
                    }}
                />
            </div>

            {/* Status Bar */}
            <div className={cn(
                "flex items-center justify-between px-4 py-1.5 text-xs border-t",
                isDirty ? "bg-amber-500/10" : "bg-muted/30"
            )}>
                <span className="text-muted-foreground font-mono">
                    {file.relativePath}
                </span>
                <span className="text-muted-foreground">
                    {isDirty ? 'Modified' : 'Saved'} | Java
                </span>
            </div>
        </div>
    )
}
