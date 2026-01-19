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
    Droplets,
    Axe,
    Shovel,
    Wheat,
    Fish,
    HardHat,
    Shirt,
    Footprints,
    Apple,
    FlaskConical,
    Puzzle,
    Crosshair,
    Sparkles,
    Sofa,
    Sprout,
    Archive,
    Bird,
    Waves,
    Crown,
    Rabbit,
    Dice5,
    Grid3X3,
    Shuffle,
    Store,
    Rocket
} from 'lucide-react'
import { ServerAssetTemplate } from '@/shared/hymn-types'

interface Template {
    id: ServerAssetTemplate
    label: string
    description: string
    icon: React.ComponentType<{ className?: string }>
    category: string
}

const TEMPLATES: Template[] = [
    // Items - Weapons
    { id: 'item_sword', label: 'Sword', description: 'Melee weapon', icon: Sword, category: 'Items' },
    { id: 'item_pickaxe', label: 'Pickaxe', description: 'Mining tool', icon: Pickaxe, category: 'Items' },
    { id: 'item', label: 'Basic Item', description: 'Generic item', icon: FileJson, category: 'Items' },
    // Items - Tools
    { id: 'item_axe', label: 'Axe', description: 'Woodcutting tool', icon: Axe, category: 'Tools' },
    { id: 'item_shovel', label: 'Shovel', description: 'Digging tool', icon: Shovel, category: 'Tools' },
    { id: 'item_hoe', label: 'Hoe', description: 'Farming tool', icon: Wheat, category: 'Tools' },
    { id: 'item_fishing_rod', label: 'Fishing Rod', description: 'Fishing tool', icon: Fish, category: 'Tools' },
    // Items - Armor
    { id: 'item_armor_helmet', label: 'Helmet', description: 'Head protection', icon: HardHat, category: 'Armor' },
    { id: 'item_armor_chestplate', label: 'Chestplate', description: 'Chest armor', icon: Shirt, category: 'Armor' },
    { id: 'item_armor_leggings', label: 'Leggings', description: 'Leg protection', icon: FileJson, category: 'Armor' },
    { id: 'item_armor_boots', label: 'Boots', description: 'Foot armor', icon: Footprints, category: 'Armor' },
    // Items - Consumables
    { id: 'item_food', label: 'Food', description: 'Edible item', icon: Apple, category: 'Consumables' },
    { id: 'item_potion', label: 'Potion', description: 'Drinkable effect', icon: FlaskConical, category: 'Consumables' },
    // Items - Other
    { id: 'item_ingredient', label: 'Ingredient', description: 'Crafting material', icon: Puzzle, category: 'Items' },
    { id: 'item_projectile', label: 'Ammo', description: 'Ammunition item', icon: Crosshair, category: 'Items' },
    { id: 'item_cosmetic', label: 'Cosmetic', description: 'Cosmetic item', icon: Sparkles, category: 'Items' },
    // Blocks
    { id: 'block_simple', label: 'Block', description: 'Solid cube', icon: Box, category: 'Blocks' },
    { id: 'block_liquid', label: 'Liquid', description: 'Fluid block', icon: Droplets, category: 'Blocks' },
    { id: 'block_furniture', label: 'Furniture', description: 'Decorative block', icon: Sofa, category: 'Blocks' },
    { id: 'block_crop', label: 'Crop', description: 'Growable plant', icon: Sprout, category: 'Blocks' },
    { id: 'block_container', label: 'Container', description: 'Storage block', icon: Archive, category: 'Blocks' },
    // Entities
    { id: 'entity_npc', label: 'Neutral NPC', description: 'Friendly character', icon: UserPlus, category: 'Entities' },
    { id: 'entity_mob', label: 'Hostile Mob', description: 'Enemy creature', icon: Ghost, category: 'Entities' },
    { id: 'entity_flying', label: 'Flying Creature', description: 'Aerial creature', icon: Bird, category: 'Entities' },
    { id: 'entity_swimming', label: 'Swimming Creature', description: 'Aquatic creature', icon: Waves, category: 'Entities' },
    { id: 'entity_boss', label: 'Boss', description: 'Boss enemy', icon: Crown, category: 'Entities' },
    { id: 'entity_passive', label: 'Passive Animal', description: 'Peaceful creature', icon: Rabbit, category: 'Entities' },
    // Data Types
    { id: 'drop_weighted', label: 'Loot Table', description: 'Weighted drop list', icon: Dice5, category: 'Data' },
    { id: 'recipe_shaped', label: 'Shaped Recipe', description: 'Crafting pattern', icon: Grid3X3, category: 'Data' },
    { id: 'recipe_shapeless', label: 'Shapeless Recipe', description: 'Unordered recipe', icon: Shuffle, category: 'Data' },
    { id: 'barter_shop', label: 'Shop', description: 'NPC trades', icon: Store, category: 'Data' },
    { id: 'projectile', label: 'Projectile', description: 'Flying object', icon: Rocket, category: 'Data' },
    // Audio & UI
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
        if (category === 'item' && (t.category === 'Items' || t.category === 'Tools' || t.category === 'Armor' || t.category === 'Consumables')) return true
        if (category === 'block' && t.category === 'Blocks') return true
        if (category === 'entity' && t.category === 'Entities') return true
        if (category === 'audio' && t.category === 'Audio') return true
        if (category === 'ui' && t.category === 'Interface') return true
        if (category === 'projectile' && t.category === 'Data' && t.id === 'projectile') return true
        if (category === 'drop' && t.category === 'Data' && t.id === 'drop_weighted') return true
        if (category === 'recipe' && t.category === 'Data' && (t.id === 'recipe_shaped' || t.id === 'recipe_shapeless')) return true
        if (category === 'barter' && t.category === 'Data' && t.id === 'barter_shop') return true
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
