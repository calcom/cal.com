# coss Checkbox

## When to use

- Single boolean consent/selection controls.
- Standalone yes/no options with explicit labeling.

## When NOT to use

- If the control is a preference toggle (on/off) in settings -> use Switch instead.
- If selecting from mutually exclusive options -> use RadioGroup instead.
- If multiple checkboxes share grouped state -> use CheckboxGroup instead.

## Install

```bash
npx shadcn@latest add @coss/checkbox
```

Manual deps from docs:

```bash
npm install @base-ui/react
```

## Canonical imports

```tsx
import { Checkbox } from "@/components/ui/checkbox"
```

## Minimal pattern

```tsx
<Label>
  <Checkbox value="terms" />
  Accept terms and conditions
</Label>
```

## Patterns from coss particles

### Key patterns

CheckboxGroup with label-wrapped options:

```tsx
<CheckboxGroup aria-label="Select frameworks" defaultValue={["next"]}>
  <Label>
    <Checkbox value="next" />
    Next.js
  </Label>
  <Label>
    <Checkbox value="vite" />
    Vite
  </Label>
  <Label>
    <Checkbox value="astro" />
    Astro
  </Label>
</CheckboxGroup>
```

Checkbox with description text (use `id`/`htmlFor`):

```tsx
const id = useId()

<div className="flex items-start gap-2">
  <Checkbox id={id} />
  <div className="flex flex-col gap-1">
    <Label htmlFor={id}>Accept terms and conditions</Label>
    <p className="text-muted-foreground text-xs">
      By clicking this checkbox, you agree to the terms.
    </p>
  </div>
</div>
```

### More examples

- disabled: `p-checkbox-2`
- with description: `p-checkbox-3`
- card style: `p-checkbox-4`
- form integration: `p-checkbox-5`

## Common pitfalls

- Using checkbox for exclusive single-choice options that should be radios.
- Missing visible label association (`Label` or `FieldLabel`) for each checkbox.
- Treating `onCheckedChange` values as plain boolean without handling indeterminate where relevant.

## Useful particle references

See `p-checkbox-1` through `p-checkbox-5` for label wrapping, disabled, description, card, and form patterns.
