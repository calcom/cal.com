# Shared Components

## What Are Shared Components

Shared components live in `packages/coss-ui/src/shared/` and are domain-specific compositions built from coss primitives. They encapsulate recurring UI patterns found across multiple settings pages.

## When to Create a Shared Component

Create a shared component when:
1. The same composition of 3+ coss primitives appears in 3+ pages
2. The pattern requires consistent behavior (e.g., copy-to-clipboard with toast feedback)
3. The pattern has domain-specific logic that is not purely presentational

Do NOT create a shared component for:
- One-off compositions used on a single page
- Thin wrappers that just re-export a coss primitive with a different name

## Existing Shared Components

### AppHeader (`@coss/ui/shared/app-header`)

Page-level header with title, description, and optional action buttons. Replaces `SettingsHeader`.

Exports: `AppHeader`, `AppHeaderContent`, `AppHeaderDescription`, `AppHeaderActions`

### ListItem (`@coss/ui/shared/list-item`)

Row component for lists/tables. Replaces `TableRow`/`TableCell` patterns.

Exports: `ListItem`, `ListItemContent`, `ListItemHeader`, `ListItemTitle`, `ListItemDescription`, `ListItemActions`

### SettingsToggle (`@coss/ui/shared/settings-toggle`)

Card with a title, description, and switch. Includes built-in `loading` skeleton support.

Exports: `SettingsToggle`

### PasswordField (`@coss/ui/shared/password-field`)

Input with show/hide toggle for password entry. Wraps `Input` with visibility button.

Exports: `PasswordField`

### FieldGrid (`@coss/ui/shared/field-grid`)

CSS grid layout for form fields (typically 2-column on desktop, 1-column on mobile).

Exports: `FieldGrid`

### CopyableField (`@coss/ui/shared/copyable-field`)

Read-only field with a copy-to-clipboard button. Fires a toast on copy.

Exports: `CopyableField`

### ItemLabel (`@coss/ui/shared/item-label`)

Compact label with icon for list items and metadata display.

Exports: `ItemLabel`

### DateRangeFilter (`@coss/ui/shared/daterange-filter`)

Date range picker used for filtering views.

Exports: `DateRangeFilter`

## Creating a New Shared Component

1. Create it in `packages/coss-ui/src/shared/<component-name>/index.tsx`
2. Use coss primitives internally (do not import from `@calcom/ui`)
3. Export all composition parts as named exports
4. Add `loading` prop support if the component is used in settings pages
5. Document the component in this file

## Import Pattern

```tsx
import { ComponentName } from "@coss/ui/shared/component-name";
```

Shared components use the `@coss/ui/shared/` import prefix to distinguish them from base primitives at `@coss/ui/components/`.
