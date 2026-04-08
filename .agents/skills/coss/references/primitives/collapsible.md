# coss Collapsible

## When to use

- Progressive disclosure of optional content.
- Expandable help/settings sections without leaving the page.

## Install

```bash
npx shadcn@latest add @coss/collapsible
```

Manual deps from docs:

```bash
npm install @base-ui/react
```

## Canonical imports

```tsx
import {
  Collapsible,
  CollapsiblePanel,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
```

## Minimal pattern

```tsx
<Collapsible>
  <CollapsibleTrigger>Can I access the file in the cloud?</CollapsibleTrigger>
  <CollapsiblePanel>
    Yes, you can access the file in the cloud.
  </CollapsiblePanel>
</Collapsible>
```

## Patterns from coss particles

### Key patterns

Controlled collapsible:

```tsx
const [open, setOpen] = useState(false)

<Collapsible open={open} onOpenChange={setOpen}>
  <CollapsibleTrigger>
    {open ? "Hide details" : "Show details"}
  </CollapsibleTrigger>
  <CollapsiblePanel>Hidden content here.</CollapsiblePanel>
</Collapsible>
```

### More examples

See `p-collapsible-1` for the core pattern.

## Common pitfalls

- Placing trigger/panel outside the same collapsible root.
- Assuming panel content is always visible/mounted for dependent logic.
- Using modal-like interactions where collapsible disclosure is more appropriate.

## Useful particle references

- core patterns: `p-collapsible-1`
