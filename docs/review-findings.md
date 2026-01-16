# Project Review Findings (January 2026)

This document summarizes the findings from a comprehensive review of the Hymn mod manager project against real Hytale mods, Assets.zip, and official documentation.

## Summary

Overall, the project is **well-architected and correctly implements** Hytale's modding system. The mod type detection, manifest parsing, and world-based configuration are all correct. A few minor issues and enhancement opportunities were identified.

## Verified Correct Implementation

### Mod Type Detection (`electron/main.ts:resolveModType`)
The detection logic correctly identifies mod types:
- `early-plugin` for anything in the earlyplugins folder
- `plugin` for mods with a `Main` field or Java classes
- `pack` for mods with manifest but no Main field

### Manifest Parsing
Correctly handles:
- All standard manifest fields (Group, Name, Version, Description, Authors, etc.)
- Dependencies in object format `{"ModId": "version"}`
- Optional fields (IncludesAssetPack, LoadBefore, SubPlugins)

### World-Based Configuration
Correctly implements per-world mod enable/disable via `Saves/{WorldName}/config.json`.

### UI Implementation
- ModsSection correctly shows badges and colors for all 3 mod types
- World selector properly filters mods by enabled state
- Delete confirmation and mod toggling work correctly

## Issues Found

### Issue 1: Misleading Location Label in Create Dialog
**File**: `src/components/sections/CreateSection.tsx:159-160`
**Current**:
```tsx
<SelectItem value="packs">UserData/Packs (Data)</SelectItem>
<SelectItem value="mods">UserData/Mods (Plugins)</SelectItem>
```
**Problem**: The label "UserData/Mods (Plugins)" is misleading. Both packs (.zip) AND plugins (.jar) are stored in UserData/Mods. The Packs folder is specifically for directory-based packs.

**Suggested Fix**:
```tsx
<SelectItem value="packs">UserData/Packs (Folder projects)</SelectItem>
<SelectItem value="mods">UserData/Mods (Standard location)</SelectItem>
```

### Issue 2: scanPacksFolder Only Handles Directories
**File**: `electron/main.ts:scanPacksFolder`
**Current**: Function skips non-directory entries (`if (!entry.isDirectory()) continue`)
**Problem**: While this matches reality (Packs folder typically only has directories), it's worth noting that if someone places a .zip there, it won't be detected.
**Status**: Low priority - this matches observed behavior.

### Issue 3: Early Plugins Path Uncertainty
**File**: `electron/main.ts`
**Problem**: The early plugins path is set but the actual location varies by system and may require `--accept-early-plugins` flag.
**Status**: Document this behavior; no code change needed.

## Enhancement Opportunities

### 1. Show "IncludesAssetPack" in UI
For plugin mods, display whether they include bundled assets. This helps users understand what they're getting.

### 2. Display Dependencies More Prominently
Some mods require Hytale modules like:
- `Hytale:EntityModule`
- `Hytale:AssetModule`
- `Hytale:AccessControlModule`

Consider showing these dependencies in the mod card or detail view.

### 3. Plugin Creation Workflow
Currently, Create Section only creates Packs (directory-based). Consider adding:
- Link to Hytale Example Project template for plugin development
- Documentation for Java 25 + Gradle 9.2.0 setup

### 4. Better Empty State Messages
When no mods are found:
- Suggest installing mods from CurseForge
- Show expected file locations

### 5. Mod Size Display
Some mods are very large (13MB+). Consider showing file sizes in the mod list.

## Documentation Updates Made

### Updated Documents
1. **modding-reference.md**: Complete rewrite with verified information from real mods
2. **architecture.md**: Updated Archive Classification section with real examples
3. **README.md**: Added reference to new mod-analysis.md

### New Documents
1. **mod-analysis.md**: Detailed analysis of 9 real Hytale mods with structure breakdowns

## Verification Sources

1. **Hytale Assets.zip** (`%AppData%\Hytale\install\release\package\game\latest\Assets.zip`)
   - Contains `Common/` and `Server/` base game assets
   - Manifest: `{"Group": "Hytale", "Name": "Hytale"}`

2. **Real Mods Analyzed** (from Desktop\example mods):
   - Packs: NoCube_Bags, Violets_Furnishings, Aures_Livestock, YUNGs HyDungeons
   - Plugins: AdminUI, Hybrid, ThePickaxesPlaceTorches, EyeSpy, LuckyMining, ymmersive-melodies
   - Mixed: One_Handed_Lanterns, Simply-Trash, BetterModlist

3. **Official Documentation**:
   - CurseForge Hytale Modding: Confirmed mod types (Pack/Plugin/Early Plugin)
   - GitHub Example Project: Confirmed Java 25, Gradle 9.2.0, manifest format

## Recommendations Priority

| Priority | Item | Effort |
|----------|------|--------|
| Low | Fix location label in CreateSection | 5 min |
| Low | Add IncludesAssetPack indicator | 30 min |
| Medium | Add dependency display | 1 hr |
| Low | Add mod size display | 30 min |
| Future | Plugin creation workflow | 4+ hrs |

## Conclusion

The Hymn project is architecturally sound and correctly implements Hytale's modding system. The minor issues identified are cosmetic/UX improvements rather than functional problems. The documentation has been updated to reflect verified information from real mod analysis.
