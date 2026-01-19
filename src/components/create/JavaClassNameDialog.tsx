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

interface JavaClassNameDialogProps {
    isOpen: boolean
    onClose: () => void
    onConfirm: (className: string, packagePath: string) => void
    templateLabel: string
    suggestedPackage?: string
    basePackage: string
}

export function JavaClassNameDialog({
    isOpen,
    onClose,
    onConfirm,
    templateLabel,
    suggestedPackage = '',
    basePackage
}: JavaClassNameDialogProps) {
    const [className, setClassName] = useState('')
    const [packagePath, setPackagePath] = useState(suggestedPackage)
    const [error, setError] = useState<string | null>(null)

    const validateClassName = (name: string): boolean => {
        if (!name) return false
        // PascalCase: starts with uppercase, only alphanumeric
        return /^[A-Z][a-zA-Z0-9]*$/.test(name)
    }

    const validatePackagePath = (path: string): boolean => {
        if (!path) return true // Empty is allowed
        // Package path: lowercase letters, dots allowed between parts
        return /^[a-z][a-z0-9]*(\.[a-z][a-z0-9]*)*$/.test(path)
    }

    const handleClassNameChange = (value: string) => {
        setClassName(value)
        if (value && !validateClassName(value)) {
            setError('Class name must be PascalCase (e.g., MyClass)')
        } else {
            setError(null)
        }
    }

    const handlePackagePathChange = (value: string) => {
        setPackagePath(value)
        if (value && !validatePackagePath(value)) {
            setError('Package must be lowercase (e.g., commands)')
        } else {
            setError(null)
        }
    }

    const handleConfirm = () => {
        if (className.trim() && validateClassName(className) && validatePackagePath(packagePath)) {
            onConfirm(className.trim(), packagePath.trim())
            onClose()
        }
    }

    const fullPackageName = packagePath
        ? `${basePackage}.${packagePath}`
        : basePackage

    const fullClassName = `${fullPackageName}.${className || 'ClassName'}`

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[450px] border-border/80 bg-card">
                <DialogHeader>
                    <DialogTitle>New {templateLabel}</DialogTitle>
                    <DialogDescription>
                        Enter a name for your new Java class.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="class-name">Class Name</Label>
                        <Input
                            id="class-name"
                            placeholder="e.g., HelloCommand"
                            value={className}
                            onChange={(e) => handleClassNameChange(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') handleConfirm()
                            }}
                            autoFocus
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="package-path">Sub-package (optional)</Label>
                        <Input
                            id="package-path"
                            placeholder="e.g., commands"
                            value={packagePath}
                            onChange={(e) => handlePackagePathChange(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') handleConfirm()
                            }}
                        />
                        <p className="text-xs text-muted-foreground">
                            Additional package path under {basePackage}
                        </p>
                    </div>
                    {error && (
                        <p className="text-xs text-destructive">{error}</p>
                    )}
                    <div className="p-3 bg-muted/50 rounded-md">
                        <p className="text-xs text-muted-foreground">
                            Full class name:
                        </p>
                        <p className="text-sm font-mono mt-1 break-all">
                            {fullClassName}
                        </p>
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="ghost" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button
                        onClick={handleConfirm}
                        disabled={!className.trim() || !validateClassName(className) || (packagePath !== '' && !validatePackagePath(packagePath))}
                    >
                        Create Class
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
