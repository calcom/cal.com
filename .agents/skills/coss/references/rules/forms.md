# Forms and Inputs Rules (coss)

Use this when implementing fields, input groups, validation states, and form examples.

## Core Rules

- For form-bound controls, default to `Field` composition (`Field`, `FieldLabel`, `FieldDescription`, `FieldError`) instead of standalone inputs.
- Always specify `type` on input-like controls where relevant (`type="text"`, `type="email"`, etc.).
- Always specify `type` on buttons (`button`, `submit`, or `reset`) instead of relying on browser defaults.
- Preserve accessible labelling:
  - visible label association (`Label`, `htmlFor`, `id`)
  - `aria-label` when there is no visible label.
- Keep validation signaling aligned between container and control (`aria-invalid`, related field semantics).

## Input Group Rule

- In `InputGroup`, place `InputGroupAddon` after `InputGroupInput` or `InputGroupTextarea` in DOM order to preserve focus behavior.

## Input OTP Rule

- Keep `maxLength` synchronized with rendered `InputOTPSlot` count.

## Textarea Rule

- coss `Textarea` already uses Base UI field control semantics internally; in normal form flows, use `Textarea` directly inside `Field` and avoid manual `FieldControl` render wiring unless a custom control implementation is truly needed.

## Do / Don't

```tsx
// Do
<Field>
  <FieldLabel>Email</FieldLabel>
  <Input type="email" />
</Field>

<InputGroup>
  <InputGroupInput type="text" />
  <InputGroupAddon>{/* ... */}</InputGroupAddon>
</InputGroup>

// Don't
<Input placeholder="Email" />

<InputGroup>
  <InputGroupAddon>{/* ... */}</InputGroupAddon>
  <InputGroupInput type="text" />
</InputGroup>
```

## Further reading

- Base UI Forms handbook: `https://base-ui.com/react/handbook/forms.md`
