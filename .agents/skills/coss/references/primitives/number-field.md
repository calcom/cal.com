# coss Number Field

## When to use

- Numeric entry with increment/decrement controls.
- Bounded stepper-style quantity/amount inputs.

## Install

```bash
npx shadcn@latest add @coss/number-field
```

Manual deps from docs:

```bash
npm install @base-ui/react
```

## Canonical imports

```tsx
import {
  NumberField,
  NumberFieldDecrement,
  NumberFieldGroup,
  NumberFieldIncrement,
  NumberFieldInput,
  NumberFieldScrubArea,
} from "@/components/ui/number-field"
```

## Minimal pattern

```tsx
<NumberField defaultValue={0}>
  <NumberFieldScrubArea label="Quantity" />
  <NumberFieldGroup>
    <NumberFieldDecrement />
    <NumberFieldInput />
    <NumberFieldIncrement />
  </NumberFieldGroup>
</NumberField>
```

For form-bound numeric inputs, prefer wrapping `NumberField` with `Field` + `FieldLabel` + `FieldError` instead of standalone usage.

## Patterns from coss particles

### Key patterns

Number field with external label and bounds:

```tsx
<Field name="quantity">
  <FieldLabel>Quantity</FieldLabel>
  <NumberField defaultValue={1} min={0} max={99}>
    <NumberFieldGroup>
      <NumberFieldDecrement />
      <NumberFieldInput />
      <NumberFieldIncrement />
    </NumberFieldGroup>
  </NumberField>
  <FieldError />
</Field>
```

Number field with scrub area (drag to adjust):

```tsx
<NumberField defaultValue={50}>
  <NumberFieldScrubArea label="Brightness" />
  <NumberFieldGroup>
    <NumberFieldDecrement />
    <NumberFieldInput />
    <NumberFieldIncrement />
  </NumberFieldGroup>
</NumberField>
```

Sizes: `sm`, `default`, `lg` on `NumberFieldGroup`.

### More examples

See `p-number-field-1` through `p-number-field-9` for sizes, disabled, scrub, range, formatted value, and step patterns.

## Common pitfalls

- Treating number field value as free-form text without numeric bounds/steps.
- Missing increment/decrement controls in stepper-style UIs where expected.
- Not validating min/max constraints and resulting clamped behavior.

## Useful particle references

- small size: `p-number-field-2`
- large size: `p-number-field-3`
- disabled: `p-number-field-4`
- with external label: `p-number-field-5`
- with scrub: `p-number-field-6`
- with range: `p-number-field-7`
- with formatted value: `p-number-field-8`
- with step: `p-number-field-9`
