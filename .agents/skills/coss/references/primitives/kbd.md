# coss Kbd

## When to use

- Keyboard shortcut keycaps near commands.
- Single or grouped key hint display in action UIs.

## Install

```bash
npx shadcn@latest add @coss/kbd
```

Manual deps from docs:

```bash
# No extra runtime dependency required for this primitive.
```

## Canonical imports

```tsx
import { Kbd, KbdGroup } from "@/components/ui/kbd"
```

## Minimal pattern

```tsx
<Kbd>K</Kbd>
```

## Patterns from coss particles

### Key patterns

Multi-key shortcut with `KbdGroup` (each key gets its own `Kbd`):

```tsx
<KbdGroup>
  <Kbd>⌘</Kbd>
  <Kbd>K</Kbd>
</KbdGroup>
```

Button with keyboard shortcut:

```tsx
<Button variant="outline">
  Print
  <KbdGroup className="-me-1">
    <Kbd>⌘</Kbd>
    <Kbd>P</Kbd>
  </KbdGroup>
</Button>
```

Single key shortcut in a button:

```tsx
<Button variant="outline">
  Save
  <Kbd className="-me-1">⌘S</Kbd>
</Button>
```

### More examples

- input group integration: `p-input-group-11`

## Common pitfalls

- Placing multi-key sequences in a single `Kbd` when `KbdGroup` is clearer.
- Using decorative keycaps without tying them to nearby actionable controls.
- Overusing kbd hints in simple UIs, adding noise instead of clarity.

## Useful particle references

- input group: `p-input-group-11`
