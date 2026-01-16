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

interface AssetNameDialogProps {
    isOpen: boolean
    onClose: () => void
    onConfirm: (name: string) => void
    templateLabel: string
    initialValue?: string
}

export function AssetNameDialog({ isOpen, onClose, onConfirm, templateLabel, initialValue }: AssetNameDialogProps) {
    const [name, setName] = useState(initialValue || '')

    // Reset or set initial value when dialog opens
    if (isOpen && initialValue && name !== initialValue && name === '') {
        setName(initialValue)
    }

    const handleConfirm = () => {
        if (name.trim()) {
            onConfirm(name.trim())
            if (!initialValue) setName('') // Only clear if creating new
            onClose()
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[400px] border-border/80 bg-card">
                <DialogHeader>
                    <DialogTitle>{initialValue ? 'Rename Asset' : `Name your ${templateLabel}`}</DialogTitle>
                    <DialogDescription>
                        Enter a unique name for your new game element.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="asset-name">Asset Name</Label>
                        <Input
                            id="asset-name"
                            placeholder="e.g. MyCoolSword"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') handleConfirm()
                            }}
                            autoFocus
                        />
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="ghost" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button onClick={handleConfirm} disabled={!name.trim()}>
                        {initialValue ? 'Rename' : 'Create Asset'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
