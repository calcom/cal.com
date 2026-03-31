# CSS Token Migration

## Class Name Mapping

Replace legacy `@calcom/ui` Tailwind utility class tokens with coss equivalents.

### Text Colors

| Old class | New class |
|---|---|
| `text-emphasis` | `text-foreground` |
| `text-default` | `text-foreground` |
| `text-subtle` | `text-muted-foreground` |
| `text-muted` | `text-muted-foreground` |
| `text-inverted` | `text-primary-foreground` |
| `text-error` | `text-destructive` |
| `text-success` | `text-success` |
| `text-attention` | `text-warning` |
| `text-info` | `text-info` |

### Background Colors

| Old class | New class |
|---|---|
| `bg-default` | `bg-background` |
| `bg-subtle` | `bg-muted` |
| `bg-muted` | `bg-muted` |
| `bg-inverted` | `bg-primary` |
| `bg-emphasis` | `bg-accent` |
| `bg-success` | `bg-success/10` |
| `bg-error` | `bg-destructive/10` |
| `bg-attention` | `bg-warning/10` |

### Border Colors

| Old class | New class |
|---|---|
| `border-subtle` | `border` (default border color) |
| `border-default` | `border` |
| `border-emphasis` | `border-foreground/20` |
| `border-error` | `border-destructive` |
| `border-booker` | `border` |
| `divide-subtle` | `divide-border` |

### Ring Colors

| Old class | New class |
|---|---|
| `ring-brand` | `ring-ring` |

## Utility Function

Replace `classNames()` and `cs()` with `cn()`:

```tsx
// Before
import { classNames } from "@calcom/lib";
const cls = classNames("base-class", condition && "conditional-class");

// After
import { cn } from "@coss/ui";
const cls = cn("base-class", condition && "conditional-class");
```

## Data Attributes

For `data-state` → boolean attribute migration (`data-state="checked"` → `data-checked`, etc.), consult the `coss` skill at `rules/migration.md`.

Cal.com-specific shorthand for active/selected buttons:

```tsx
// Before
<Button data-state={isActive ? "active" : undefined}>

// After
<Button data-pressed={isActive ? "" : undefined}>
```

## Hover / Focus States

If the old code uses `hover:bg-subtle`, replace with `hover:bg-muted`. Similarly:

| Old hover/focus class | New class |
|---|---|
| `hover:bg-subtle` | `hover:bg-muted` |
| `hover:bg-emphasis` | `hover:bg-accent` |
| `focus:ring-brand` | `focus:ring-ring` |
| `focus-visible:ring-brand` | `focus-visible:ring-ring` |

## Dark Mode

If the file uses explicit `dark:` prefixes with old tokens, update them to the new tokens. However, coss components use CSS variables that automatically handle dark mode, so many explicit `dark:` classes can be removed entirely.
