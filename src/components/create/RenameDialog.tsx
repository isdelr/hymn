import { useState } from 'react'
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

interface RenameDialogProps {
    isOpen: boolean
    onClose: () => void
    onConfirm: (newName: string) => void
    title: string
    description: string
    label: string
    currentName: string
    placeholder?: string
    validateFn?: (name: string) => string | null
}

export function RenameDialog({
    isOpen,
    onClose,
    onConfirm,
    title,
    description,
    label,
    currentName,
    placeholder,
    validateFn
}: RenameDialogProps) {
    const [newName, setNewName] = useState(currentName)
    const [error, setError] = useState<string | null>(null)

    const handleNameChange = (value: string) => {
        setNewName(value)
        if (validateFn) {
            setError(validateFn(value))
        } else {
            setError(null)
        }
    }

    const handleConfirm = () => {
        if (!newName.trim()) return
        if (validateFn) {
            const validationError = validateFn(newName.trim())
            if (validationError) {
                setError(validationError)
                return
            }
        }
        if (newName.trim() !== currentName) {
            onConfirm(newName.trim())
        }
        onClose()
    }

    const isValid = newName.trim() && !error && newName.trim() !== currentName

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[400px] border-border/80 bg-card">
                <DialogHeader>
                    <DialogTitle>{title}</DialogTitle>
                    <DialogDescription>
                        {description}
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="rename-input">{label}</Label>
                        <Input
                            id="rename-input"
                            placeholder={placeholder}
                            value={newName}
                            onChange={(e) => handleNameChange(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && isValid) handleConfirm()
                            }}
                            autoFocus
                        />
                    </div>
                    {error && (
                        <p className="text-xs text-destructive">{error}</p>
                    )}
                </div>
                <DialogFooter>
                    <Button variant="ghost" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button
                        onClick={handleConfirm}
                        disabled={!isValid}
                    >
                        Rename
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
