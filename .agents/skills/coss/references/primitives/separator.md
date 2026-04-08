# coss Separator

## When to use

- Visual/semantic separation between related blocks.
- Section dividers in menus, cards, and grouped controls.

## Install

```bash
npx shadcn@latest add @coss/separator
```

Manual deps from docs:

```bash
npm install @base-ui/react
```

## Canonical imports

```tsx
import { Separator } from "@/components/ui/separator"
```

## Minimal pattern

```tsx
<div className="flex flex-col gap-2">
  <span className="text-sm">Section A</span>
  <Separator />
  <span className="text-sm">Section B</span>
</div>
```

## Patterns from coss particles

### Key patterns

Horizontal separator (default):

```tsx
<Separator />
```

Vertical separator inline:

```tsx
<div className="flex items-center gap-4">
  <span>Home</span>
  <Separator orientation="vertical" className="h-4" />
  <span>Settings</span>
</div>
```

### More examples

See `p-separator-1` for the core pattern. Also used within `p-menu-1`, `p-group-1`, and `p-input-group-7`.

## Common pitfalls

- Adding separators between every small element, creating visual clutter.
- Using separators where spacing alone communicates grouping better.
- Forgetting orientation/context in dense vertical command layouts.

## Useful particle references

- core patterns: `p-separator-1`
- cross-primitive dividers: `p-menu-1`, `p-group-1`, `p-input-group-7`
