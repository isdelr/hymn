import {
  Boxes,
  Package,
  Code,
  Zap,
  Settings,
  ToggleLeft,
  FileArchive,
  MapPin,
  Power,
  FileText,
  Link,
  AlertTriangle,
  Shield,
  RefreshCw,
  CheckCircle,
} from 'lucide-react'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

// Reusable icon container (matching SettingsSection pattern)
function IconBox({
  children,
  colorClass,
}: {
  children: React.ReactNode
  colorClass: string
}) {
  return (
    <div
      className={cn(
        'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg',
        colorClass
      )}
    >
      {children}
    </div>
  )
}

// Mod type card component
function ModTypeCard({
  icon: Icon,
  title,
  badge,
  badgeColor,
  description,
  details,
}: {
  icon: React.ElementType
  title: string
  badge: string
  badgeColor: string
  description: string
  details: string[]
}) {
  return (
    <div className="flex gap-4 py-3">
      <IconBox colorClass={badgeColor}>
        <Icon className="h-5 w-5 text-inherit" />
      </IconBox>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="font-medium">{title}</span>
          <Badge variant="secondary" className={cn('text-xs', badgeColor)}>
            {badge}
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground mb-2">{description}</p>
        <ul className="text-xs text-muted-foreground space-y-1">
          {details.map((detail, i) => (
            <li key={i} className="flex items-start gap-2">
              <span className="text-muted-foreground/70">•</span>
              <span>{detail}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

// Glossary term component
function GlossaryTerm({
  icon: Icon,
  term,
  definition,
  example,
}: {
  icon: React.ElementType
  term: string
  definition: string
  example?: string
}) {
  return (
    <div className="py-3">
      <div className="flex items-center gap-2 mb-1">
        <Icon className="h-4 w-4 text-muted-foreground" />
        <span className="font-medium">{term}</span>
      </div>
      <p className="text-sm text-muted-foreground ml-6">{definition}</p>
      {example && (
        <p className="text-xs text-muted-foreground/70 ml-6 mt-1 italic">
          {example}
        </p>
      )}
    </div>
  )
}

// Step component for "How It Works"
function Step({
  number,
  title,
  description,
}: {
  number: number
  title: string
  description: string
}) {
  return (
    <div className="flex gap-4 py-3">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold text-sm">
        {number}
      </div>
      <div className="flex-1 min-w-0">
        <span className="font-medium">{title}</span>
        <p className="text-sm text-muted-foreground mt-0.5">{description}</p>
      </div>
    </div>
  )
}

// Feature item component
function FeatureItem({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ElementType
  title: string
  description: string
}) {
  return (
    <div className="flex gap-3 py-2">
      <Icon className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
      <div>
        <span className="font-medium text-sm">{title}</span>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
    </div>
  )
}

export function HelpSection() {
  return (
    <div className="space-y-6">
      {/* Welcome Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <IconBox colorClass="bg-primary/10">
              <Boxes className="h-5 w-5 text-primary" />
            </IconBox>
            <div>
              <CardTitle>Welcome to Hymn</CardTitle>
              <CardDescription>
                Your mod manager for Hytale
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Hymn makes it easy to manage mods for Hytale. You can install, organize,
            and toggle mods without worrying about breaking your game. Think of it as
            a friendly assistant that handles all the technical stuff for you.
          </p>
        </CardContent>
      </Card>

      {/* Accordion Sections */}
      <Accordion type="multiple" className="space-y-2">
        {/* Understanding Mod Types */}
        <AccordionItem value="mod-types" className="border rounded-lg px-4">
          <AccordionTrigger className="hover:no-underline">
            <div className="flex items-center gap-3">
              <IconBox colorClass="bg-violet-500/10">
                <Package className="h-5 w-5 text-violet-500" />
              </IconBox>
              <div className="text-left">
                <div className="font-medium">Understanding Mod Types</div>
                <div className="text-sm text-muted-foreground font-normal">
                  Learn about Packs, Plugins, and Early Plugins
                </div>
              </div>
            </div>
          </AccordionTrigger>
          <AccordionContent className="pt-2">
            <div className="space-y-2 divide-y divide-border">
              <ModTypeCard
                icon={Package}
                title="Pack"
                badge="No coding"
                badgeColor="bg-emerald-500/10 text-emerald-500"
                description="Visual content that changes how the game looks or sounds."
                details={[
                  'Includes textures, models, sounds, and UI changes',
                  'Safe and easy to use - just drag and drop',
                  'Cannot change game mechanics or add new features',
                ]}
              />
              <ModTypeCard
                icon={Code}
                title="Plugin"
                badge="Requires Java"
                badgeColor="bg-blue-500/10 text-blue-500"
                description="Code mods that can add new features and change game behavior."
                details={[
                  'Can add new items, creatures, game mechanics',
                  'Requires the game to support plugins',
                  'More powerful but needs careful compatibility checking',
                ]}
              />
              <ModTypeCard
                icon={Zap}
                title="Early Plugin"
                badge="Advanced"
                badgeColor="bg-orange-500/10 text-orange-500"
                description="System-level mods that load before the game fully starts."
                details={[
                  'Can make deep changes to how the game works',
                  'Used for compatibility layers and core modifications',
                  'Recommended for experienced modders only',
                ]}
              />
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Key Features */}
        <AccordionItem value="features" className="border rounded-lg px-4">
          <AccordionTrigger className="hover:no-underline">
            <div className="flex items-center gap-3">
              <IconBox colorClass="bg-emerald-500/10">
                <ToggleLeft className="h-5 w-5 text-emerald-500" />
              </IconBox>
              <div className="text-left">
                <div className="font-medium">Key Features</div>
                <div className="text-sm text-muted-foreground font-normal">
                  What Hymn can do for you
                </div>
              </div>
            </div>
          </AccordionTrigger>
          <AccordionContent className="pt-2">
            <div className="space-y-1">
              <FeatureItem
                icon={Power}
                title="Enable/Disable Mods"
                description="Turn mods on or off without uninstalling them. Great for troubleshooting or trying different combinations."
              />
              <FeatureItem
                icon={MapPin}
                title="Per-World Settings"
                description="Different worlds can have different mods enabled. Your survival world can have different mods than your creative world."
              />
              <FeatureItem
                icon={FileArchive}
                title="Import/Export Modpacks"
                description="Share your mod setup with friends or save it for later. Export creates a file you can share."
              />
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* How It Works */}
        <AccordionItem value="how-it-works" className="border rounded-lg px-4">
          <AccordionTrigger className="hover:no-underline">
            <div className="flex items-center gap-3">
              <IconBox colorClass="bg-blue-500/10">
                <Settings className="h-5 w-5 text-blue-500" />
              </IconBox>
              <div className="text-left">
                <div className="font-medium">How It Works</div>
                <div className="text-sm text-muted-foreground font-normal">
                  Getting started in 4 simple steps
                </div>
              </div>
            </div>
          </AccordionTrigger>
          <AccordionContent className="pt-2">
            <div className="space-y-1">
              <Step
                number={1}
                title="Set your install location"
                description="Go to Settings and select where Hytale is installed on your computer. Hymn needs this to know where to put mods."
              />
              <Step
                number={2}
                title="Add mods"
                description="Import mods by dragging them into Hymn, or place mod files directly in your mods folder. Hymn will detect them automatically."
              />
              <Step
                number={3}
                title="Select a world"
                description="Choose which world you want to configure. Each world can have its own set of enabled mods."
              />
              <Step
                number={4}
                title="Toggle mods on/off"
                description="Click the toggle next to any mod to enable or disable it. Changes take effect when you next launch the game."
              />
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Common Terms */}
        <AccordionItem value="glossary" className="border rounded-lg px-4">
          <AccordionTrigger className="hover:no-underline">
            <div className="flex items-center gap-3">
              <IconBox colorClass="bg-pink-500/10">
                <FileText className="h-5 w-5 text-pink-500" />
              </IconBox>
              <div className="text-left">
                <div className="font-medium">Common Terms</div>
                <div className="text-sm text-muted-foreground font-normal">
                  Glossary of modding terms explained simply
                </div>
              </div>
            </div>
          </AccordionTrigger>
          <AccordionContent className="pt-2">
            <div className="divide-y divide-border">
              <GlossaryTerm
                icon={FileText}
                term="Manifest"
                definition="A small file inside each mod that tells Hymn what the mod is called, who made it, and what it needs to work. Think of it like a label on a package."
                example='Example: "This mod is called Better Trees, version 1.2, made by ModderPro"'
              />
              <GlossaryTerm
                icon={Link}
                term="Dependencies"
                definition="Other mods that a mod needs to work. If Mod A depends on Mod B, you need both installed for Mod A to function."
                example="Example: A furniture mod might depend on a core library mod"
              />
              <GlossaryTerm
                icon={AlertTriangle}
                term="Conflicts"
                definition="When two mods try to change the same thing and can't work together. Hymn will warn you when this happens."
                example="Example: Two mods that both change the sky texture"
              />
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Safety Features */}
        <AccordionItem value="safety" className="border rounded-lg px-4">
          <AccordionTrigger className="hover:no-underline">
            <div className="flex items-center gap-3">
              <IconBox colorClass="bg-green-500/10">
                <Shield className="h-5 w-5 text-green-500" />
              </IconBox>
              <div className="text-left">
                <div className="font-medium">Safety Features</div>
                <div className="text-sm text-muted-foreground font-normal">
                  How Hymn keeps your game safe
                </div>
              </div>
            </div>
          </AccordionTrigger>
          <AccordionContent className="pt-2">
            <div className="space-y-1">
              <FeatureItem
                icon={RefreshCw}
                title="Non-Destructive Changes"
                description="Hymn doesn't permanently modify your game files. Disabling a mod completely removes its effects."
              />
              <FeatureItem
                icon={CheckCircle}
                title="Validation Checks"
                description="Before enabling mods, Hymn checks for conflicts and missing dependencies. You'll get warnings if something might cause problems."
              />
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  )
}
