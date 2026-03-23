# coss Toggle

## When to use

- Pressable two-state commands (formatting/tool modes).
- Single-command active/inactive interactions without group state.

## When NOT to use

- If the control is a binary preference setting -> use Switch instead.
- If multiple toggles share state -> use ToggleGroup instead.

## Install

```bash
npx shadcn@latest add @coss/toggle
```

Manual deps from docs:

```bash
npm install @base-ui/react
```

## Canonical imports

```tsx
import { Toggle } from "@/components/ui/toggle"
```

## Minimal pattern

```tsx
<Toggle>Toggle</Toggle>
```

## Patterns from coss particles

### Key patterns

Icon toggle with `aria-label` (always required for icon-only):

```tsx
<Toggle aria-label="Toggle bold" value="bold">
  <BoldIcon />
</Toggle>
```

ToggleGroup with icon toggles:

```tsx
<ToggleGroup defaultValue={["bold"]}>
  <Toggle aria-label="Toggle bold" value="bold">
    <BoldIcon />
  </Toggle>
  <Toggle aria-label="Toggle italic" value="italic">
    <ItalicIcon />
  </Toggle>
  <Toggle aria-label="Toggle underline" value="underline">
    <UnderlineIcon />
  </Toggle>
</ToggleGroup>
```

Variants: `default`, `outline`. Sizes: `sm`, `default`, `lg`.

### More examples

- outline: `p-toggle-2`
- with icon: `p-toggle-3`
- small / large size: `p-toggle-4`, `p-toggle-5`
- disabled: `p-toggle-6`
- icon group: `p-toggle-7`

## Common pitfalls

- Using toggle for destructive/submit actions better represented by `Button`.
- Missing pressed-state semantics in controlled toggle flows.
- Using standalone toggles when mutually exclusive behavior needs `ToggleGroup`.

## Useful particle references

See `p-toggle-1` through `p-toggle-7` for variants, sizes, and icon group patterns.
