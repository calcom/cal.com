# coss Popover

## When to use

- Contextual floating content near a trigger.
- Inline editing/help panels without full modal lock.

## When NOT to use

- If the content requires user focus/action before dismissal -> use Dialog instead.
- If the content is just a short text hint -> use Tooltip instead.
- If it's a list of actions -> use Menu instead.

## Install

```bash
npx shadcn@latest add @coss/popover
```

Manual deps from docs:

```bash
npm install @base-ui/react
```

## Canonical imports

```tsx
import {
  Popover,
  PopoverClose,
  PopoverCreateHandle,
  PopoverDescription,
  PopoverPopup,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover"
```

## Minimal pattern

```tsx
<Popover>
  <PopoverTrigger render={<Button variant="outline" />}>Open Popover</PopoverTrigger>
  <PopoverPopup>
    <PopoverTitle>Popover Title</PopoverTitle>
    <PopoverDescription>Popover Description</PopoverDescription>
    <PopoverClose render={<Button variant="outline" />}>Close</PopoverClose>
  </PopoverPopup>
</Popover>
```

## Patterns from coss particles

- **Form-in-popover**: use `PopoverPopup` as a lightweight form container (for example feedback forms with `Form` + `Field` + `Textarea`).
- **Dismiss controls**: use `PopoverClose` both for footer actions and icon close buttons (`aria-label` + `render={<Button size="icon" .../>}`).
- **Tooltip-like popovers**: use `tooltipStyle` for info-icon helper content where tooltip density is preferred.
- **Detached triggers**: use `PopoverCreateHandle` + shared `handle`/`payload` on multiple `PopoverTrigger`s to animate one popup across triggers.
- **Position tuning**: only add `side`, `align`, `sideOffset`, `alignOffset` when default anchoring is not sufficient.

## Common pitfalls

- Treating Popover as a modal replacement when the flow needs full modal behavior (use Dialog/AlertDialog instead).
- Forgetting `render` composition on trigger/close when using coss buttons.
- Missing accessible names on icon-only triggers or close controls.
- Using detached trigger handles without stable payload/content mapping.
- Copying Tooltip patterns directly without checking `tooltipStyle` and popover semantics.

## Useful particle references

- baseline popover with form content: `p-popover-1`
- close controls (icon + action button): `p-popover-2`
- detached trigger handle pattern: `p-popover-3`
- tooltip-style popover usage example: `p-input-group-7`
