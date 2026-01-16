# UI / UX Direction

## Design Philosophy

Hymn's interface is designed around **simplicity and clarity**. The app should feel intuitive from the first launch, with a clear path from setup to mod management. We prioritize:

- **Minimal navigation**: 3 main sections instead of 5
- **Unified workflows**: Library and Profiles merged into one "Mods" view
- **Progressive disclosure**: Advanced features are accessible but not overwhelming
- **Visual feedback**: Clear status indicators and confirmation dialogs

## Visual Style

### Color Palette (OkLCH)

**Dark Mode Only** - The UI ships with a single, polished dark theme.

```css
/* Background layers */
--background: oklch(0.12 0.01 260);  /* Deep blue-purple */
--card: oklch(0.16 0.01 260);        /* Slightly lighter panels */
--muted: oklch(0.22 0.01 260);       /* Subtle backgrounds */

/* Primary accent - Blue */
--primary: oklch(0.65 0.18 250);     /* Interactive elements */

/* Semantic colors */
--success: oklch(0.7 0.18 145);      /* Green for success states */
--warning: oklch(0.8 0.15 85);       /* Amber for warnings */
--destructive: oklch(0.65 0.2 25);   /* Red for errors/delete */

/* Text */
--foreground: oklch(0.95 0.01 260);        /* Primary text */
--muted-foreground: oklch(0.65 0.02 260);  /* Secondary text */
```

### Typography

- **Headings**: Semi-bold, 1.25-1.5rem
- **Body**: Regular weight, 0.875rem
- **Small**: 0.75rem for metadata
- **Monospace**: Code, paths, JSON editing

### Spacing & Radius

- **Border radius**: 0.75rem (12px) base
- **Card padding**: 1rem-1.5rem
- **Gap between elements**: 0.5rem-1.5rem
- **Max content width**: 80rem (1280px)

## Layout Structure

### Navigation (Icon Rail)

A minimal 64px sidebar with:
- Logo at top
- 3 navigation icons (Mods, Create, Settings)
- Connection status indicator at bottom
- Hover tooltips for labels

### Main Views

#### 1. Mods (Default)

**Purpose**: Unified mod management combining library browsing and profile configuration.

**Layout**: Two-column with responsive sidebar
- **Main area**: Mod grid with search/filter
- **Sidebar**: Profile panel, load order, quick stats

**Key Features**:
- Card-based mod display with type badges
- Toggle switches for enable/disable
- Drag-and-drop load order
- Profile switching via button group
- Apply/Rollback with confirmation dialogs

#### 2. Create (Playground)

**Purpose**: A full-featured IDE for visual mod creation.

**View 1: Projects Dashboard**
- Grid of local mod projects (Pack/Plugin)
- "New Project" wizard modal
- Quick actions: Build, Open Folder

**View 2: Editor Workspace (The Playground)**
**Layout**: 3-Panel IDE
- **Left (Explorer)**: File tree (manifest, Server/, Common/) with context menus
- **Center (Canvas)**: 
  - **Visual Form Editor**: For JSON assets (Items, Blocks)
  - **Code Editor**: Monaco-like fallback for raw JSON
  - **Previewer**: For textures/models
- **Top (Toolbar)**: Breadcrumbs, Build button, View toggles

**Key Features**:
- "Playground" feel with instant visual feedback
- Schema-driven forms (no manual JSON typing for basics)
- Drag-and-drop asset assignment

#### 3. Settings

**Purpose**: Configuration and diagnostics.

**Layout**: Stacked cards
- Install location config
- Import/Export modpacks
- Diagnostics panel
- Backup management
- About info

**Key Features**:
- Health status indicators
- Confirmation dialogs for destructive actions
- Inline success/error messages

### Welcome Screen (First Launch)

Shown when no install path is configured:
- Hero section with logo and tagline
- Feature highlights (3 cards)
- Single CTA to select Hytale folder
- Links to settings for help

## Component Patterns

### Cards

```tsx
<Card>
  <CardHeader>
    <CardTitle>Title</CardTitle>
    <CardDescription>Subtitle</CardDescription>
  </CardHeader>
  <CardContent>
    {/* Content */}
  </CardContent>
</Card>
```

### Status Messages

```tsx
// Success
<div className="bg-success/10 text-success rounded-lg p-3">
  <Check /> Message
</div>

// Error
<div className="bg-destructive/10 text-destructive rounded-lg p-3">
  <AlertTriangle /> Message
</div>

// Warning
<div className="bg-warning/10 text-warning rounded-lg p-3">
  <AlertTriangle /> Message
</div>
```

### Confirmation Dialogs

All destructive or significant actions use dialogs:
- Apply Profile
- Rollback Changes
- Delete Backup
- Restore Backup

### Empty States

Centered, with icon and helpful text:
```tsx
<div className="flex flex-col items-center py-16 text-center">
  <Package className="h-12 w-12 text-muted-foreground/50" />
  <h3>No mods found</h3>
  <p className="text-muted-foreground">Helpful guidance text</p>
</div>
```

## Interactions

### Drag and Drop (Load Order)

- Visual grip handle
- Reduced opacity while dragging
- Drop target highlighting
- Instant position update

### Loading States

- Button text changes (e.g., "Scanning...")
- Spinner icons with `animate-spin`
- Disabled state during operations

### Transitions

- 200ms ease-out for most interactions
- Hover states on cards and buttons
- Focus rings for accessibility

## Responsive Behavior

- **Desktop (1024px+)**: Full two-column layouts
- **Tablet (768px-1023px)**: Stacked cards, collapsible sidebar
- **Mobile (<768px)**: Single column, hamburger navigation

## Accessibility

- Keyboard navigation support
- Focus indicators on all interactive elements
- Aria labels for icon-only buttons
- Sufficient color contrast (WCAG AA)
- Screen reader friendly structure
