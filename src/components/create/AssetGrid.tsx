import { Plus, Search, Filter, MoreVertical, Pencil, Trash, FolderOpen } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ServerAsset } from '@/shared/hymn-types'
import { Badge } from '@/components/ui/badge'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface AssetGridProps {
    category: string
    assets: ServerAsset[]
    onAssetSelect: (asset: ServerAsset) => void
    onAddNew: () => void
    onRename?: (asset: ServerAsset) => void
    onDelete?: (asset: ServerAsset) => void
    onReveal?: (asset: ServerAsset) => void
}

const TAG_COLORS: Record<string, string> = {
    item: "bg-blue-500/10 text-blue-500 border-blue-500/20",
    block: "bg-green-500/10 text-green-500 border-green-500/20",
    entity: "bg-red-500/10 text-red-500 border-red-500/20",
    audio: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
    ui: "bg-purple-500/10 text-purple-500 border-purple-500/20",
}

export function AssetGrid({ category, assets, onAssetSelect, onAddNew, onRename, onDelete, onReveal }: AssetGridProps) {
    const filteredAssets = assets.filter(a => category === 'all' || category === 'files' || a.kind === category)

    return (
        <div className="flex flex-col h-full p-6 space-y-6 overflow-hidden">
            <div className="flex items-center justify-between">
                <div className="space-y-1">
                    <h2 className="text-2xl font-bold tracking-tight capitalize">{category === 'all' ? 'Project Overview' : category + 's'}</h2>
                    <p className="text-sm text-muted-foreground">Manage and edit your {category} assets.</p>
                </div>

                <div className="flex items-center gap-2">
                    <div className="relative w-64 group">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                        <Input
                            placeholder="Search assets..."
                            className="pl-9 h-10 bg-card/50 border-muted-foreground/20 focus-visible:ring-primary/30"
                        />
                    </div>
                    <Button variant="outline" size="icon" className="h-10 w-10">
                        <Filter className="h-4 w-4" />
                    </Button>
                    <Button onClick={onAddNew} className="h-10 gap-2 font-bold glow-primary">
                        <Plus className="h-4 w-4" />
                        New {category === 'all' || category === 'files' ? 'Asset' : category}
                    </Button>
                </div>
            </div>

            <div className="flex-1 overflow-auto pr-2 custom-scrollbar">
                {filteredAssets.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full gap-4 text-center opacity-70">
                        <div className="w-20 h-20 rounded-full bg-muted/50 flex items-center justify-center border-2 border-dashed border-muted-foreground/30">
                            <Search className="h-8 w-8 text-muted-foreground/50" />
                        </div>
                        <div>
                            <h3 className="font-semibold text-lg">No {category} assets found</h3>
                            <p className="text-sm text-muted-foreground max-w-xs">
                                Start by creating a new asset from a template or importing one from vanilla files.
                            </p>
                        </div>
                        <Button variant="outline" onClick={onAddNew}>
                            Create Asset
                        </Button>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
                        {filteredAssets.map((asset) => (
                            <AssetCard
                                key={asset.id}
                                asset={asset}
                                onClick={() => onAssetSelect(asset)}
                                onRename={() => onRename?.(asset)}
                                onDelete={() => onDelete?.(asset)}
                                onReveal={() => onReveal?.(asset)}
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}

interface AssetCardProps {
    asset: ServerAsset
    onClick: () => void
    onRename?: () => void
    onDelete?: () => void
    onReveal?: () => void
}

function AssetCard({ asset, onClick, onRename, onDelete, onReveal }: AssetCardProps) {
    const colorClass = TAG_COLORS[asset.kind] || "bg-muted text-muted-foreground border-border"
    return (
        <div
            className="group relative flex flex-col bg-card border border-border rounded-xl overflow-hidden hover:border-primary cursor-pointer"
            onClick={onClick}
        >
            <div className="aspect-square bg-muted/30 flex items-center justify-center relative overflow-hidden">
                <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100" />
                <div className="w-16 h-16 rounded-xl bg-background/50 shadow-sm flex items-center justify-center">
                    <span className="text-2xl font-bold text-primary/40 group-hover:text-primary">
                        {asset.name.charAt(0).toUpperCase()}
                    </span>
                </div>

                <Badge variant="outline" className={`absolute top-2 left-2 text-[10px] uppercase font-bold tracking-wider border ${colorClass}`}>
                    {asset.kind}
                </Badge>
                <div onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <button className="absolute top-2 right-2 p-1.5 rounded-lg bg-background/80 opacity-0 group-hover:opacity-100 transition-all hover:bg-primary hover:text-white z-10">
                                <MoreVertical className="h-3.5 w-3.5" />
                            </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuItem onClick={onReveal} className="gap-2">
                                <FolderOpen className="h-4 w-4" /> Reveal in File Explorer
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={onRename} className="gap-2">
                                <Pencil className="h-4 w-4" /> Rename
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={onDelete} className="gap-2 text-destructive focus:text-destructive">
                                <Trash className="h-4 w-4" /> Delete
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>

            <div className="p-3 space-y-1 bg-card">
                <div className="flex items-center justify-between">
                    <h4 className="font-bold text-sm truncate">{asset.displayName || asset.name}</h4>
                </div>
                <p className="text-[10px] text-muted-foreground font-mono truncate opacity-60">
                    {asset.id}
                </p>
            </div>
        </div>
    )
}
