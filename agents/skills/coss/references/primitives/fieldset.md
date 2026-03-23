# coss Fieldset

## When to use

- Grouped related controls under one legend/description.
- Complex forms requiring semantic grouping for radios/checkboxes.

## Install

```bash
npx shadcn@latest add @coss/fieldset
```

Manual deps from docs:

```bash
npm install @base-ui/react
```

## Canonical imports

```tsx
import { Fieldset, FieldsetLegend } from "@/components/ui/fieldset"
```

## Minimal pattern

```tsx
<Fieldset>
  <FieldsetLegend>Fieldset legend</FieldsetLegend>
</Fieldset>
```

## Patterns from coss particles

### Key patterns

Fieldset grouping related fields:

```tsx
<Fieldset>
  <FieldsetLegend>Personal Information</FieldsetLegend>
  <Field name="firstName">
    <FieldLabel>First name</FieldLabel>
    <Input type="text" />
  </Field>
  <Field name="lastName">
    <FieldLabel>Last name</FieldLabel>
    <Input type="text" />
  </Field>
</Fieldset>
```

Always include `FieldsetLegend` as the accessible group heading.

### More examples

See `p-fieldset-1` for the core pattern.

## Common pitfalls

- Using ad-hoc div wrappers instead of semantic fieldset for grouped controls.
- Omitting `FieldsetLegend`, reducing accessibility context.
- Placing unrelated controls inside one fieldset, hurting form clarity.

## Useful particle references

- core patterns: `p-fieldset-1`
- form composition references: `p-form-1`, `p-form-2`, `p-input-group-24`
