import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogTitle
} from '@/components/ui/dialog'
import {
    Terminal,
    Radio,
    Puzzle,
    FileCode
} from 'lucide-react'
import { JavaClassTemplate } from '@/shared/hymn-types'

export interface JavaTemplate {
    id: JavaClassTemplate
    label: string
    description: string
    icon: React.ComponentType<{ className?: string }>
    suggestedPackage: string
}

const JAVA_TEMPLATES: JavaTemplate[] = [
    {
        id: 'command',
        label: 'Command',
        description: 'Chat command handler',
        icon: Terminal,
        suggestedPackage: 'commands'
    },
    {
        id: 'event_listener',
        label: 'Event Listener',
        description: 'Game event hooks',
        icon: Radio,
        suggestedPackage: 'listeners'
    },
    {
        id: 'component',
        label: 'Component',
        description: 'Entity component',
        icon: Puzzle,
        suggestedPackage: 'components'
    },
    {
        id: 'custom_class',
        label: 'Class',
        description: 'Empty Java class',
        icon: FileCode,
        suggestedPackage: ''
    },
]

interface JavaTemplateGalleryProps {
    isOpen: boolean
    onClose: () => void
    onSelect: (template: JavaTemplate) => void
}

export function JavaTemplateGallery({ isOpen, onClose, onSelect }: JavaTemplateGalleryProps) {
    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[500px] border-border/80 bg-card p-0 overflow-hidden">
                <div className="px-6 py-6 border-b bg-muted/10">
                    <DialogTitle className="text-xl font-bold">New Java Class</DialogTitle>
                    <DialogDescription className="text-xs">
                        Choose a template for your new Java class.
                    </DialogDescription>
                </div>

                <div className="p-6 grid grid-cols-2 gap-4">
                    {JAVA_TEMPLATES.map((tpl) => {
                        const Icon = tpl.icon
                        return (
                            <button
                                key={tpl.id}
                                className="flex flex-col items-center gap-3 p-4 rounded-xl border border-border/50 bg-card hover:bg-muted/50 hover:border-primary/50 hover:shadow-md text-center group"
                                onClick={() => onSelect(tpl)}
                            >
                                <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center group-hover:bg-primary/20 group-hover:text-primary">
                                    <Icon className="h-5 w-5 text-muted-foreground group-hover:text-primary" />
                                </div>
                                <div className="space-y-0.5">
                                    <div className="font-semibold text-sm">{tpl.label}</div>
                                    <div className="text-[10px] text-muted-foreground">{tpl.description}</div>
                                </div>
                            </button>
                        )
                    })}
                </div>
            </DialogContent>
        </Dialog>
    )
}
