# coss Radio Group

## When to use

- Mutually exclusive option selection.
- Single-choice settings with clear option labels.

## When NOT to use

- If multiple options can be selected -> use CheckboxGroup instead.
- If options are many and need search/filtering -> use Select or Combobox instead.
- If the choices are binary (on/off) -> use Switch or Checkbox instead.

## Install

```bash
npx shadcn@latest add @coss/radio-group
```

Manual deps from docs:

```bash
npm install @base-ui/react
```

## Canonical imports

```tsx
import { Label } from "@/components/ui/label"
import { Radio, RadioGroup } from "@/components/ui/radio-group"
```

## Minimal pattern

```tsx
<RadioGroup defaultValue="next">
  <Label>
    <Radio value="next" /> Next.js
  </Label>
  <Label>
    <Radio value="vite" /> Vite
  </Label>
  <Label>
    <Radio value="astro" /> Astro
  </Label>
</RadioGroup>
```

For form-bound single-choice groups, prefer `Field` + `Fieldset` composition to keep legend and validation semantics consistent.

## Patterns from coss particles

### Key patterns

Radio group with descriptions:

```tsx
<RadioGroup defaultValue="comfortable" aria-label="Spacing preference">
  <Label className="flex items-start gap-3">
    <Radio value="default" />
    <div>
      <span className="font-medium">Default</span>
      <p className="text-muted-foreground text-xs">Standard spacing for most layouts.</p>
    </div>
  </Label>
  <Label className="flex items-start gap-3">
    <Radio value="comfortable" />
    <div>
      <span className="font-medium">Comfortable</span>
      <p className="text-muted-foreground text-xs">Extra padding for readability.</p>
    </div>
  </Label>
</RadioGroup>
```

Controlled radio group:

```tsx
const [value, setValue] = useState("default")

<RadioGroup value={value} onValueChange={setValue}>
  ...
</RadioGroup>
```

### More examples

See `p-radio-group-1` through `p-radio-group-5` for disabled, description, card-style, and form integration patterns.

## Common pitfalls

- Using radios for multi-select behavior that requires checkbox group.
- Missing label association for each radio option.
- Handling selected value as array when radio group returns single value.

## Useful particle references

- disabled: `p-radio-group-2`
- with description: `p-radio-group-3`
- card style: `p-radio-group-4`
- form integration: `p-radio-group-5`
- form composition references: `p-form-1`, `p-form-2`, `p-input-group-24`
