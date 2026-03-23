# coss Label

## When to use

- Visible accessible labels for inputs and controls.
- Simple `htmlFor`/`id` associations in forms and settings UIs.

## Install

```bash
npx shadcn@latest add @coss/label
```

Manual deps from docs:

```bash
# No extra runtime dependency required for this primitive.
```

## Canonical imports

```tsx
import { Label } from "@/components/ui/label"
```

## Minimal pattern

```tsx
<Label htmlFor="email">Email</Label>
```

## Patterns from coss particles

### Key patterns

Label paired with input:

```tsx
const id = useId()

<div className="flex flex-col gap-2">
  <Label htmlFor={id}>Email</Label>
  <Input id={id} type="email" placeholder="name@example.com" />
</div>
```

Label wrapping a checkbox:

```tsx
<Label>
  <Checkbox />
  Accept terms and conditions
</Label>
```

Prefer `FieldLabel` within `Field` for validation-aware forms.

### More examples

See `p-field-1`, `p-input-1`, `p-checkbox-1` for label-in-form patterns.

## Common pitfalls

- Using `aria-label` when visible `Label` text exists and can be associated.
- Mismatching `htmlFor`/`id` between label and control.
- Using label component as generic typography instead of form labeling.

## Useful particle references

- with checkbox: `checkbox-demo`
- label-specific particles: no dedicated `p-label-*` family; use form references `p-field-1`, `p-input-1`, `p-checkbox-1`.
