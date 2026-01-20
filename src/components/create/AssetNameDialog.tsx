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

const formSchema = z.object({
    name: z.string()
        .min(1, 'Asset name is required')
        .transform(val => val.trim())
})

type FormData = z.infer<typeof formSchema>

interface AssetNameDialogProps {
    isOpen: boolean
    onClose: () => void
    onConfirm: (name: string) => void
    templateLabel: string
    initialValue?: string
}

export function AssetNameDialog({ isOpen, onClose, onConfirm, templateLabel, initialValue }: AssetNameDialogProps) {
    const form = useForm<FormData>({
        resolver: zodResolver(formSchema),
        defaultValues: { name: initialValue || '' },
        mode: 'onChange',
    })

    // Reset form when dialog opens
    useEffect(() => {
        if (isOpen) {
            form.reset({ name: initialValue || '' })
        }
    }, [isOpen, initialValue, form])

    const handleSubmit = (data: FormData) => {
        onConfirm(data.name)
        onClose()
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
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleSubmit)}>
                        <div className="grid gap-4 py-4">
                            <FormField
                                control={form.control}
                                name="name"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Asset Name</FormLabel>
                                        <FormControl>
                                            <Input
                                                placeholder="e.g. MyCoolSword"
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
                            <Button type="submit" disabled={!form.formState.isValid}>
                                {initialValue ? 'Rename' : 'Create Asset'}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    )
}
