# coss Toggle Group

## When to use

- Grouped pressed-state controls (single or multiple).
- Formatting/action sets needing button-like toggles with shared state.

## Install

```bash
npx shadcn@latest add @coss/toggle-group
```

Manual deps from docs:

```bash
npm install @base-ui/react
```

## Canonical imports

```tsx
import { Toggle, ToggleGroup } from "@/components/ui/toggle-group"
```

## Minimal pattern

```tsx
<ToggleGroup>
  <Toggle>Bold</Toggle>
  <Toggle>Italic</Toggle>
  <Toggle>Underline</Toggle>
</ToggleGroup>
```

## Patterns from coss particles

### Key patterns

Toggle group with icon buttons:

```tsx
<ToggleGroup defaultValue={["bold"]}>
  <Toggle aria-label="Toggle bold" value="bold">
    <BoldIcon aria-hidden="true" />
  </Toggle>
  <Toggle aria-label="Toggle italic" value="italic">
    <ItalicIcon aria-hidden="true" />
  </Toggle>
  <Toggle aria-label="Toggle underline" value="underline">
    <UnderlineIcon aria-hidden="true" />
  </Toggle>
</ToggleGroup>
```

Multiple selection (default). For single selection use `type="single"`.

Controlled toggle group:

```tsx
const [value, setValue] = useState(["bold"])

<ToggleGroup value={value} onValueChange={setValue}>
  ...
</ToggleGroup>
```

### More examples

See `p-toggle-group-1` through `p-toggle-group-9` for sizes, outline, vertical, disabled, multiple, and tooltip patterns.

## Common pitfalls

- Using toggle-group when plain buttons (no pressed state) are more appropriate.
- Wrong value shape for mode (`multiple` array vs single selection).
- Missing accessible labels on icon-only toggle items.

## Useful particle references

- small toggles: `p-toggle-group-2`
- large toggles: `p-toggle-group-3`
- with outline toggles: `p-toggle-group-4`
- vertical: `p-toggle-group-5`
- disabled: `p-toggle-group-6`
- with disabled toggle: `p-toggle-group-7`
- multiple selection: `p-toggle-group-8`
- with tooltips: `p-toggle-group-9`
