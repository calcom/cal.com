# coss Field

## When to use

- Accessible field wrappers with labels, descriptions, and errors.
- Form control state wiring (`invalid`, `required`, touched/error messaging).

## Install

```bash
npx shadcn@latest add @coss/field
```

Manual deps from docs:

```bash
npm install @base-ui/react
```

## Canonical imports

```tsx
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
  FieldValidity,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
```

## Minimal pattern

```tsx
<Field>
  <FieldLabel>Name</FieldLabel>
  <Input type="text" placeholder="Enter your name" />
  <FieldDescription>Visible on your profile</FieldDescription>
  <FieldError>Please enter a valid name</FieldError>
  <FieldValidity>
    {(validity) => (
      {validity.error && <p>{validity.error}</p>}
    )}
  </FieldValidity>
</Field>
```

## Patterns from coss particles

### Key patterns

Required field with error:

```tsx
<Field name="email">
  <FieldLabel>Email *</FieldLabel>
  <Input type="email" required placeholder="name@company.com" />
  <FieldDescription>We'll never share your email.</FieldDescription>
  <FieldError>Please enter a valid email.</FieldError>
</Field>
```

Field wrapping an autocomplete:

```tsx
<Field name="framework">
  <FieldLabel>Framework</FieldLabel>
  <Autocomplete items={items}>
    <AutocompleteInput placeholder="Search..." />
    <AutocompletePopup>
      <AutocompleteList>
        {(item) => <AutocompleteItem key={item.value} value={item}>{item.label}</AutocompleteItem>}
      </AutocompleteList>
    </AutocompletePopup>
  </Autocomplete>
  <FieldError />
</Field>
```

### More examples

See `p-field-1` through `p-field-9` for required, disabled, error, validity, input-group, autocomplete, and combobox field patterns.

## Common pitfalls

- Rendering errors detached from the related control, breaking context.
- Missing `name` in form flows, causing silent submit omissions.
- Using field wrapper without corresponding label/description/error semantics.

## Useful particle references

- required field: `p-field-2`
- disabled field: `p-field-3`
- with error: `p-field-4`
- with validity: `p-field-5`
- input group: `p-field-6`
- autocomplete field: `p-field-7`
- combobox field: `p-field-8`
- combobox multiple field: `p-field-9`
- form composition references: `p-form-1`, `p-form-2`, `p-input-group-24`
