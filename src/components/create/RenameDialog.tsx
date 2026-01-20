import { useEffect } from 'react'
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
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form'

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
    // Create schema with optional custom validation
    const formSchema = z.object({
        name: z.string()
            .min(1, 'Name is required')
            .transform(val => val.trim())
            .refine(
                val => val !== currentName,
                'Name must be different from current name'
            )
            .superRefine((val, ctx) => {
                if (validateFn) {
                    const error = validateFn(val)
                    if (error) {
                        ctx.addIssue({
                            code: z.ZodIssueCode.custom,
                            message: error,
                        })
                    }
                }
            })
    })

    type FormData = z.infer<typeof formSchema>

    const form = useForm<FormData>({
        resolver: zodResolver(formSchema),
        defaultValues: { name: currentName },
        mode: 'onChange',
    })

    // Reset form when dialog opens with new currentName
    useEffect(() => {
        if (isOpen) {
            form.reset({ name: currentName })
        }
    }, [isOpen, currentName, form])

    const handleSubmit = (data: FormData) => {
        onConfirm(data.name)
        onClose()
    }

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[400px] border-border/80 bg-card">
                <DialogHeader>
                    <DialogTitle>{title}</DialogTitle>
                    <DialogDescription>
                        {description}
                    </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleSubmit)}>
                        <div className="grid gap-4 py-4">
                            <FormField
                                control={form.control}
                                name="name"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>{label}</FormLabel>
                                        <FormControl>
                                            <Input
                                                placeholder={placeholder}
                                                autoFocus
                                                {...field}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="ghost" onClick={onClose}>
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                disabled={!form.formState.isValid}
                            >
                                Rename
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    )
}
