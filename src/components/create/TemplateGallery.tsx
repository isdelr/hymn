import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogTitle
} from '@/components/ui/dialog'
import {
    filterTemplatesByWorkspaceCategory,
    type ServerAssetTemplateInfo,
} from '@/shared/templates'
import { getServerAssetIcon } from './templateIcons'

/**
 * Template type for TemplateGallery selections.
 * Includes the icon component resolved from the template info.
 */
export interface Template extends ServerAssetTemplateInfo {
    icon: React.ComponentType<{ className?: string }>
}

interface TemplateGalleryProps {
    isOpen: boolean
    onClose: () => void
    onSelect: (template: Template) => void
    category?: string
}

export function TemplateGallery({ isOpen, onClose, onSelect, category }: TemplateGalleryProps) {
    // Get filtered templates with resolved icons
    const filteredTemplates: Template[] = filterTemplatesByWorkspaceCategory(category ?? 'all')
        .map(t => ({
            ...t,
            icon: getServerAssetIcon(t.iconName),
        }))

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[700px] border-border/80 bg-card p-0 overflow-hidden">
                <div className="px-6 py-6 border-b bg-muted/10">
                    <DialogTitle className="text-xl font-bold">New Asset</DialogTitle>
                    <DialogDescription className="text-xs">
                        Choose a starting point for your new game element.
                    </DialogDescription>
                </div>

                <div className="p-6 grid grid-cols-2 sm:grid-cols-3 gap-4 max-h-[60vh] overflow-y-auto custom-scrollbar">
                    {filteredTemplates.map((tpl) => {
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
