# coss Badge

## When to use

- Short status/category labels and counts.
- Inline metadata chips paired with buttons, tables, and cards.

## Install

```bash
npx shadcn@latest add @coss/badge
```

Manual deps from docs:

```bash
npm install @base-ui/react
```

## Canonical imports

```tsx
import { Badge } from "@/components/ui/badge"
```

## Minimal pattern

```tsx
<Badge>Badge</Badge>
```

## Patterns from coss particles

### Key patterns

Variants via the `variant` prop:

```tsx
<Badge>Default</Badge>
<Badge variant="outline">Outline</Badge>
<Badge variant="secondary">Secondary</Badge>
<Badge variant="destructive">Destructive</Badge>
<Badge variant="info">Info</Badge>
<Badge variant="success">Success</Badge>
<Badge variant="warning">Warning</Badge>
<Badge variant="error">Error</Badge>
```

Badge with decorative icon:

```tsx
<Badge variant="outline">
  <CheckIcon aria-hidden="true" />
  Verified
</Badge>
```

Badge inside a button (use negative margin for alignment):

```tsx
<Button variant="outline">
  Messages
  <Badge className="-me-1" variant="outline">18</Badge>
</Button>
```

### More examples

See `p-badge-1` through `p-badge-9` for all variant/size combinations.

## Common pitfalls

- Using badge as interactive button without proper button semantics.
- Applying raw palette classes instead of semantic tokens/variants for status.
- Overloading badge content with long text that should be normal body copy.

## Useful particle references

See `p-badge-1` through `p-badge-9` for all variants (outline, secondary, destructive, info, success, warning, error, small).
