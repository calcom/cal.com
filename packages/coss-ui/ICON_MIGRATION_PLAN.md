# Icon Migration Plan: `@calcom/ui/components/icon` to `@coss/ui/icons`

## Background

The codebase previously used a sprite-based `<Icon name="plus" />` component from `@calcom/ui/components/icon`. This has been replaced with individual component exports from `@coss/ui/icons` (e.g., `<PlusIcon />`).

A large initial migration was done, but many files still use the old system.

## Current Status

| Area | Already migrated | Still using old `Icon` |
|------|------------------|-----------------------|
| `apps/web/` | ~80 files | ~50 files |
| `packages/app-store/` | ~40 files | ~14 files |
| `packages/features/` | ~30 files | ~6 files |
| `packages/platform/` | ~20 files | ~5 files |
| `packages/ui/` | ~19 files | ~1 file |
| **Total** | **~189 files** | **~88 files** |

10 files have both old and new imports (partially migrated).

## Migration Categories

### 1. Static icon names (straightforward)

Files that use `<Icon name="literal-string" />` with hardcoded string names. These are direct replacements:

```diff
- import { Icon } from "@calcom/ui/components/icon";
+ import { PlusIcon } from "@coss/ui/icons";

- <Icon name="plus" className="h-4 w-4" />
+ <PlusIcon className="h-4 w-4" />
```

The `@coss/ui/icons` components accept `size`, `className`, and `onClick` props. The `style` prop for sizing should be replaced with the `size` prop:

```diff
- <Icon name="upload" style={{ width: 32, height: 32 }} />
+ <UploadIcon size={32} />
```

### 2. Dynamic icon names (requires mapping utility)

Files that pass icon names as variables or props:

```tsx
<Icon name={iconName} /> // iconName is a variable
```

These need a lookup utility (e.g., `iconMap["plus"]` returns `PlusIcon`) or a component API change.

### 3. Button component `StartIcon`/`EndIcon` props

The `Button` component from `@calcom/ui` accepts string-based icon names:

```tsx
<Button StartIcon="plus" EndIcon="arrow-right">Click</Button>
```

These require changes to the `Button` component API in `packages/ui/` to support component-based icons, and are out of scope for static migration PRs.

## PR Plan

### PR 1 - Static icon replacements in `apps/web/` (this PR)

Replace all `<Icon name="literal" />` usages where the name is a static string in `apps/web/`. ~12 files changed.

### PR 2 - Static icon replacements in `packages/`

Same treatment for `packages/app-store`, `packages/features`, `packages/platform`. ~15 files.

### PR 3 - Partially migrated files cleanup

Clean up the ~10 files that have both old and new imports side by side.

### PR 4 - Dynamic icon migration + `packages/ui` component API changes

- Introduce an icon mapping utility in `@coss/ui/icons`
- Update `Button`, `Badge`, `EmptyScreen`, and other `packages/ui` components that accept `IconName` string props
- Migrate all dynamic `<Icon name={variable} />` usages

### PR 5 - Email templates + final cleanup

- Migrate icon references in `packages/emails`
- Remove the old `@calcom/ui/components/icon` module entirely
- Remove the `IconName` type export

## Icon Name to Component Mapping

| Old `name` string | New component |
|-------------------|---------------|
| `arrow-right` | `ArrowRightIcon` |
| `asterisk` | `AsteriskIcon` |
| `calendar` | `CalendarIcon` |
| `chevron-right` | `ChevronRightIcon` |
| `circle-arrow-up` | `CircleArrowUpIcon` |
| `clipboard` | `ClipboardIcon` |
| `dot` | `DotIcon` |
| `download` | `DownloadIcon` |
| `external-link` | `ExternalLinkIcon` |
| `eye-off` | `EyeOffIcon` |
| `file-text` | `FileTextIcon` |
| `info` | `InfoIcon` |
| `plus` | `PlusIcon` |
| `upload` | `UploadIcon` |
| `x` | `XIcon` |

The naming convention is PascalCase of the kebab-case name with `Icon` suffix.
