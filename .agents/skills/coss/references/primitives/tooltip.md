# coss Tooltip

## When to use

- Short helper text on hover/focus for controls and icons.
- Non-blocking contextual hints without modal behavior.

## When NOT to use

- If the content is interactive (links, buttons) -> use Popover instead.
- If the content is rich (images, forms) -> use PreviewCard or Popover instead.
- If the hint should persist until dismissed -> use Popover instead.

## Install

```bash
npx shadcn@latest add @coss/tooltip
```

Manual deps from docs:

```bash
npm install @base-ui/react
```

## Canonical imports

```tsx
import {
  Tooltip,
  TooltipCreateHandle,
  TooltipPopup,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
```

## Minimal pattern

```tsx
<Tooltip>
  <TooltipTrigger render={<Button variant="outline" />}>
    Hover me
  </TooltipTrigger>
  <TooltipPopup>Helpful hint</TooltipPopup>
</Tooltip>
```

## Patterns from coss particles

### Key patterns

Tooltip on an icon-only button:

```tsx
<Tooltip>
  <TooltipTrigger render={<Button size="icon" variant="ghost" aria-label="Settings" />}>
    <SettingsIcon aria-hidden="true" />
  </TooltipTrigger>
  <TooltipPopup>Settings</TooltipPopup>
</Tooltip>
```

Grouped tooltips (shared delay/provider):

```tsx
<TooltipProvider>
  <Tooltip>
    <TooltipTrigger>Item 1</TooltipTrigger>
    <TooltipPopup>Hint 1</TooltipPopup>
  </Tooltip>
  <Tooltip>
    <TooltipTrigger>Item 2</TooltipTrigger>
    <TooltipPopup>Hint 2</TooltipPopup>
  </Tooltip>
</TooltipProvider>
```

### More examples

See `p-tooltip-1` through `p-tooltip-3` for basic, grouped, and animated tooltip patterns.

## Common pitfalls

- Placing interactive controls inside tooltip content (tooltip should stay informational).
- Relying on tooltip as sole label for icon-only controls (still provide accessible name).
- Using tooltip for long-form content that should be popover/dialog.

## Useful particle references

- grouped tooltips: `p-tooltip-2`
- animated tooltips: `p-tooltip-3`
- cross-overlay references: `p-dialog-1`, `p-popover-1`, `p-menu-2`
