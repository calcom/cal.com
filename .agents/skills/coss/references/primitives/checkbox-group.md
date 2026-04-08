# coss Checkbox Group

## When to use

- Multi-select option groups with shared label context.
- Collecting multiple values under one field name.

## Install

```bash
npx shadcn@latest add @coss/checkbox-group
```

Manual deps from docs:

```bash
npm install @base-ui/react
```

## Canonical imports

```tsx
import { Checkbox } from "@/components/ui/checkbox"
import { CheckboxGroup } from "@/components/ui/checkbox-group"
```

## Minimal pattern

```tsx
<CheckboxGroup>
  <Label>
    <Checkbox defaultChecked />
    Next.js
  </Label>
  <Label>
    <Checkbox />
    Vite
  </Label>
  <Label>
    <Checkbox />
    Astro
  </Label>
</CheckboxGroup>
```

For form-bound option groups, prefer `Field` + `Fieldset` composition so legend, labels, and errors are grouped correctly.

## Patterns from coss particles

### Key patterns

Group with `aria-label` and `defaultValue`:

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
</CheckboxGroup>
```

Controlled group:

```tsx
const [value, setValue] = useState(["next"])

<CheckboxGroup value={value} onValueChange={setValue}>
  ...
</CheckboxGroup>
```

For form-bound groups, use `Field` + `Fieldset` so legend, labels, and errors are grouped correctly.

### More examples

See `p-checkbox-group-1` through `p-checkbox-group-5` for disabled items, parent checkbox, nested, and form patterns.

## Common pitfalls

- Using checkbox group when only one option should be selected.
- Missing group label/legend context for assistive technology.
- Incorrectly handling submitted values as scalar instead of array/list.

## Useful particle references

- with disabled item: `p-checkbox-group-2`
- parent checkbox: `p-checkbox-group-3`
- nested parent checkbox: `p-checkbox-group-4`
- form integration: `p-checkbox-group-5`
- form composition references: `p-form-1`, `p-form-2`, `p-input-group-24`
