import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogTitle
} from '@/components/ui/dialog'
import {
    Sword,
    Pickaxe,
    Box,
    UserPlus,
    Ghost,
    Music,
    Layout,
    FileJson,
    Droplets
} from 'lucide-react'
import { ServerAssetTemplate } from '@/shared/hymn-types'

interface Template {
    id: ServerAssetTemplate
    label: string
    description: string
    icon: any
    category: string
}

const TEMPLATES: Template[] = [
    { id: 'item_sword', label: 'Sword', description: 'Melee weapon', icon: Sword, category: 'Items' },
    { id: 'item_pickaxe', label: 'Pickaxe', description: 'Mining tool', icon: Pickaxe, category: 'Items' },
    { id: 'item', label: 'Basic Item', description: 'Generic item', icon: FileJson, category: 'Items' },
    { id: 'block_simple', label: 'Block', description: 'Solid cube', icon: Box, category: 'Blocks' },
    { id: 'block_liquid', label: 'Liquid', description: 'Fluid block', icon: Droplets, category: 'Blocks' },
    { id: 'entity_npc', label: 'Neutral NPC', description: 'Friendly character', icon: UserPlus, category: 'Entities' },
    { id: 'entity_mob', label: 'Hostile Mob', description: 'Enemy creature', icon: Ghost, category: 'Entities' },
    { id: 'audio_sfx', label: 'Sound FX', description: 'Audio event', icon: Music, category: 'Audio' },
    { id: 'ui_page', label: 'UI Page', description: 'Interface screen', icon: Layout, category: 'Interface' },
]

interface TemplateGalleryProps {
    isOpen: boolean
    onClose: () => void
    onSelect: (template: Template) => void
    category?: string
}

export function TemplateGallery({ isOpen, onClose, onSelect, category }: TemplateGalleryProps) {
    const filteredTemplates = TEMPLATES.filter(t => {
        if (!category || category === 'all' || category === 'files') return true
        // Map category IDs to Template categories
        if (category === 'item' && t.category === 'Items') return true
        if (category === 'block' && t.category === 'Blocks') return true
        if (category === 'entity' && t.category === 'Entities') return true
        if (category === 'audio' && t.category === 'Audio') return true
        if (category === 'ui' && t.category === 'Interface') return true
        return false
    })
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
