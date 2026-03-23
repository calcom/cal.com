# coss Form

## When to use

- Structured form validation and submission flows.
- Forms with field-level labels, descriptions, and errors.
- Integrations with external form libraries (for example React Hook Form / TanStack Form).

## Install

```bash
npx shadcn@latest add @coss/form
```

Manual deps:

```bash
npm install @base-ui/react zod
```

## Canonical imports

```tsx
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/components/ui/field"
import { Form } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
```

## Minimal pattern

```tsx
<Form onSubmit={(e) => {/* handle submit */}}>
  <Field>
    <FieldLabel>Email</FieldLabel>
    <Input name="email" type="email" required />
    <FieldDescription>Used for account updates</FieldDescription>
    <FieldError>Please enter a valid email.</FieldError>
  </Field>
</Form>
```

## Patterns from coss particles

- `Form` usage in particles is intentionally lightweight; use the Base UI forms handbook patterns below for deeper validation/library integrations.

## Patterns from coss/Base UI forms

- **Submission mode**: use `onSubmit` for native `FormData` handling; use `onFormSubmit` when you want parsed form values object from Base UI Form.
- **Field naming**: set `name` on each field/control flow so values are included in submission.
- **Accessible names**: prefer visible labels (`FieldLabel`, `SelectLabel`, etc.); use `aria-label` only when no visible label exists.
- **Grouped controls**: for radio/checkbox groups or multi-control sections, use fieldset-style grouping (`Fieldset` + `Field.Item`) instead of ad-hoc wrappers.
- **Validation rendering**: pair constraints/custom validation with `FieldError`; keep error output semantically tied to the same field.
- **Textarea integration**: use coss `Textarea` directly inside `Field`; it already integrates with Base UI field control semantics, so `FieldControl render={...}` is not required for standard textarea usage.
- **External library integration**: when using RHF/TanStack, forward refs/input refs to the underlying control and map invalid/touched/dirty state into `Field`.

## Common pitfalls

- Using `Form` without field-level structure (`Field`, label, error).
- Missing control `name` (field not present in form submission payload).
- Missing input `type` and button `type`.
- Showing validation messages without matching invalid semantics.
- Using grouped checkboxes/radios without proper group legend/structure.
- Not forwarding refs in RHF/TanStack integration, which breaks focus-on-error behavior.

## Useful particle references

- `p-form-1` (basic integration)
- `p-form-2` (zod usage)

## Further reading

- Base UI Forms handbook: `https://base-ui.com/react/handbook/forms.md`

