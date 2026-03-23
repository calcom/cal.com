# coss Group

## When to use

- Connected controls with shared visual boundary.
- Composed action clusters using buttons, toggles, and menu triggers.

## Install

```bash
npx shadcn@latest add @coss/group
```

Manual deps from docs:

```bash
npm install @base-ui/react
```

## Canonical imports

```tsx
import { Button } from "@/components/ui/button"
import { Group, GroupSeparator } from "@/components/ui/group"
```

## Minimal pattern

```tsx
<Group>
  <Button>Button</Button>
  <GroupSeparator />
  <Button>Button</Button>
</Group>
```

## Patterns from coss particles

### Key patterns

Button group with separator:

```tsx
<Group>
  <Button variant="outline">Copy</Button>
  <GroupSeparator />
  <Button variant="outline">Paste</Button>
  <GroupSeparator />
  <Button variant="outline">Cut</Button>
</Group>
```

Group with input and button:

```tsx
<Group>
  <Input type="text" placeholder="Enter URL..." />
  <GroupSeparator />
  <Button>Go</Button>
</Group>
```

Sizes: `sm`, `default`, `lg`. Orientation: vertical via `orientation="vertical"`.

### More examples

See `p-group-1` through `p-group-9` for input, sizes, disabled, vertical, and labeled text patterns.

## Common pitfalls

- Forgetting `GroupSeparator` between controls in connected groups.
- Mixing control sizes/variants that break shared group silhouette.
- Using standalone controls where a grouped action model is expected.

## Useful particle references

- with input: `p-group-2`
- small size: `p-group-3`
- large size: `p-group-4`
- with disabled button: `p-group-5`
- with default buttons: `p-group-6`
- with start labeled text: `p-group-7`
- with end text: `p-group-8`
- vertical: `p-group-9`
