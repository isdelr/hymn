import {
    Package,
    Box,
    Users,
    Music,
    Monitor,
    Code,
    Image as ImageIcon,
    FolderOpen,
    LayoutGrid,
    Rocket,
    Dice5,
    ChefHat,
    Store
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { ServerAssetKind } from '@/shared/hymn-types'

interface AssetCategory {
    id: ServerAssetKind | 'all' | 'files'
    label: string
    icon: React.ComponentType<{ className?: string }>
}

const CATEGORIES: AssetCategory[] = [
    { id: 'all', label: 'Overview', icon: LayoutGrid },
    { id: 'item', label: 'Items', icon: Package },
    { id: 'block', label: 'Blocks', icon: Box },
    { id: 'entity', label: 'NPCs & Entities', icon: Users },
    { id: 'projectile', label: 'Projectiles', icon: Rocket },
    { id: 'drop', label: 'Loot Tables', icon: Dice5 },
    { id: 'recipe', label: 'Recipes', icon: ChefHat },
    { id: 'barter', label: 'Shops', icon: Store },
    { id: 'audio', label: 'Audio', icon: Music },
    { id: 'ui', label: 'Interface', icon: Monitor },
    { id: 'script', label: 'Scripts', icon: Code },
    { id: 'texture', label: 'Textures', icon: ImageIcon },
    { id: 'files', label: 'Advanced Files', icon: FolderOpen },
]

interface AssetNavigatorProps {
    activeCategory: string
    onCategoryChange: (category: string) => void
}

export function AssetNavigator({ activeCategory, onCategoryChange }: AssetNavigatorProps) {
    return (
        <div className="flex flex-col h-full bg-card/5 py-4">
            <div className="px-4 mb-4">
                <h3 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">Asset Manager</h3>
            </div>
            <div className="flex-1 space-y-1 px-2">
                {CATEGORIES.map((cat) => {
                    const Icon = cat.icon
                    const isActive = activeCategory === cat.id

                    return (
                        <button
                            key={cat.id}
                            onClick={() => onCategoryChange(cat.id)}
                            className={cn(
                                "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all duration-200 group",
                                isActive
                                    ? "bg-primary/10 text-primary font-semibold shadow-sm"
                                    : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                            )}
                        >
                            <Icon className={cn(
                                "h-4 w-4 transition-transform group-hover:scale-110",
                                isActive ? "text-primary" : "text-muted-foreground/70"
                            )} />
                            <span>{cat.label}</span>
                            {isActive && (
                                <div className="ml-auto w-1 h-4 bg-primary rounded-full animate-in slide-in-from-right-1" />
                            )}
                        </button>
                    )
                })}
            </div>
        </div>
    )
}
