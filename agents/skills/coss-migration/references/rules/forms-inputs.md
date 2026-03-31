# Forms & Input Fields Migration

## Form Component

Prefer the coss-ui `Form` component integrated with React Hook Form (RHF). Consult the Base UI forms handbook at `https://base-ui.com/react/handbook/forms.md` for integration details.

### Before

```tsx
import { Form } from "@calcom/ui";

<Form form={form} handleSubmit={onSubmit}>
  {/* fields */}
</Form>
```

### After

```tsx
import { Form } from "@coss/ui/components/form";

<Form onSubmit={form.handleSubmit(onSubmit)}>
  {/* fields */}
</Form>
```

### `className="contents"` Pattern

When `<Form>` wraps layout-sensitive children (e.g., inside a Dialog or a `CardFrame`), add `className="contents"` so the `<form>` element does not introduce an extra box in the layout:

```tsx
<Form className="contents" onSubmit={form.handleSubmit(onSubmit)}>
  <CardFrame>
    {/* ... */}
  </CardFrame>
</Form>
```

This is *critical* inside dialogs — see [dialogs-overlays.md § Form-in-Dialog Pattern](./dialogs-overlays.md#form-in-dialog-pattern).

### When to deviate

If a specific UI logic suggests a different approach (e.g., complex multi-step state, wizard wrappers where Base UI validation would block submission), stop and ask for confirmation before deviating from the Form + RHF pattern.

## Field Composition (General)

Every form control should be wrapped in a `Field` composition. `Field` is the Base UI primitive that wires together label, description, error, and validation state.

### Key props

| Prop | Purpose |
|---|---|
| `name` | Connects to the form field name — required for Base UI native validation and accessibility |
| `invalid` | Boolean from RHF `fieldState.invalid` — triggers `data-invalid` on all children |
| `touched` | Boolean from RHF `fieldState.isTouched` |
| `dirty` | Boolean from RHF `fieldState.isDirty` |
| `className` | Spacing adjustments (e.g., `className="mt-4"` for a field nested under a collapsible) |

### Sub-components

- **`FieldLabel`** — Always use instead of standalone `Label`. Supports `htmlFor` to match an input `id`.
- **`FieldDescription`** — Helper text below the input. Renders as muted small text.
- **`FieldError`** — Validation error message. Supports a `match` prop for conditional display.
- **`FieldControl`** — Wraps non-standard inputs to connect them to the Field.
- **`FieldValidity`** — Render-prop access to the field's native `ValidityState`.

### FieldError `match` prop

`FieldError` uses the Base UI `match` prop to conditionally show errors:

```tsx
// Show when RHF has an error (controlled validation)
<FieldError match={!!error}>{error?.message}</FieldError>

// Show for native validation states
<FieldError match="valueMissing">{t("error_required_field")}</FieldError>

// Combined — show custom error OR native fallback
<FieldError match={errorMessage ? true : "valueMissing"}>
  {errorMessage ?? t("error_required_field")}
</FieldError>
```

## Controller + Field Integration Pattern

When using RHF `Controller`, destructure the full `field` and `fieldState` and pass them to `Field`:

```tsx
<Controller
  name="note"
  control={form.control}
  rules={{ required: t("error_required_field") }}
  render={({
    field: { ref, name, value, onBlur, onChange },
    fieldState: { invalid, isTouched, isDirty, error },
  }) => (
    <Field name={name} invalid={invalid} touched={isTouched} dirty={isDirty}>
      <FieldLabel>{t("personal_note")}</FieldLabel>
      <Input
        id={name}
        ref={ref}
        name={name}
        placeholder={t("personal_note_placeholder")}
        value={value}
        onBlur={onBlur}
        onChange={(e) => onChange(e.target.value)}
      />
      <FieldError match={!!error}>{error?.message}</FieldError>
    </Field>
  )}
/>
```

Key points:
- Pass `name` and `invalid` to `Field` for accessibility and styling
- Use `id={name}` on the input so `FieldLabel` auto-associates via `htmlFor`
- Destructure `ref` separately — some components need explicit `ref` forwarding

## TextField to Field + Input

The monolithic `TextField` decomposes into a composition of `Field`, `FieldLabel`, and `Input`.

### Before

```tsx
import { TextField } from "@calcom/ui";

<TextField
  label={t("name")}
  placeholder={t("enter_name")}
  {...register("name")}
  error={errors.name?.message}
/>
```

### After (simple — with `register`)

```tsx
import { Field, FieldLabel, FieldError } from "@coss/ui/components/field";
import { Input } from "@coss/ui/components/input";

<Field>
  <FieldLabel>{t("name")}</FieldLabel>
  <Input placeholder={t("enter_name")} {...register("name")} />
  {errors.name && <FieldError>{errors.name.message}</FieldError>}
</Field>
```

### After (full — with `Controller`)

Use the Controller pattern (see above) when you need `invalid`/`touched`/`dirty` state on `Field`, or when the input component doesn't support `register` (e.g., PasswordField, Select).

Always prefer `Field` composition over standalone `Label` components.

## TextField with addOnLeading to InputGroup

### Before

```tsx
<TextField
  addOnLeading={<span>{baseUrl}/</span>}
  {...register("slug")}
/>
```

### After

```tsx
import { InputGroup, InputGroupAddon, InputGroupInput, InputGroupText } from "@coss/ui/components/input-group";

<InputGroup>
  <InputGroupInput {...register("slug")} />
  <InputGroupAddon>
    <InputGroupText>{baseUrl}/</InputGroupText>
  </InputGroupAddon>
</InputGroup>
```

Note: In `InputGroup`, place `InputGroupAddon` after `InputGroupInput` in DOM order to preserve focus behavior. Use CSS (`order-first`) to visually position the addon before the input if needed.

## PasswordField

Use the shared `PasswordField` component which includes a show/hide toggle built on `InputGroup`.

### Before

```tsx
import { PasswordField } from "@calcom/ui";

<PasswordField label={t("password")} {...register("password")} />
```

### After (with Controller — preferred for validation)

```tsx
import { PasswordField } from "@coss/ui/shared/password-field";
import { Field, FieldLabel, FieldError } from "@coss/ui/components/field";

<Controller
  name="oldPassword"
  control={control}
  rules={{ required: t("error_required_field") }}
  render={({
    field: { ref, name, value, onBlur, onChange },
    fieldState: { invalid, isTouched, isDirty, error },
  }) => (
    <Field name={name} invalid={invalid} touched={isTouched} dirty={isDirty}>
      <FieldLabel>{t("old_password")}</FieldLabel>
      <PasswordField
        ref={ref}
        autoComplete="current-password"
        name={name}
        value={value ?? ""}
        onBlur={onBlur}
        onValueChange={onChange}
      />
      <FieldError match={!!error}>{error?.message}</FieldError>
    </Field>
  )}
/>
```

### After (uncontrolled — simple dialog fields without RHF)

```tsx
<Field name="password" invalid={!!errorMessage}>
  <FieldLabel htmlFor="password">{t("password")}</FieldLabel>
  <PasswordField
    id="password"
    name="password"
    required
    value={password}
    onChange={(e) => setPassword(e.target.value)}
  />
  <FieldError match={errorMessage ? true : "valueMissing"}>
    {errorMessage ?? t("error_required_field")}
  </FieldError>
</Field>
```

Note: Base UI's `Input` exposes `onValueChange` (a `(value: string) => void` callback wired internally into the native `onChange`). For Controller integration, pass `onValueChange={onChange}` directly — it matches RHF's `field.onChange` signature. For local state, use standard `onChange={(e) => setPassword(e.target.value)}`. Both patterns are used in the codebase — see `password-view.tsx` (Controller) and `EnableTwoFactorModal.tsx` (local state).

## SelectField to Select

The react-select-based `SelectField` is replaced with the Base UI `Select`.

### Before

```tsx
import { SelectField } from "@calcom/ui";

<SelectField
  label={t("expiration")}
  options={options}
  value={selectedOption}
  onChange={(opt) => setValue(opt.value)}
/>
```

### After (standalone)

```tsx
import { Select, SelectTrigger, SelectValue, SelectPopup, SelectItem } from "@coss/ui/components/select";
import { Field, FieldLabel } from "@coss/ui/components/field";

<Field>
  <FieldLabel>{t("expiration")}</FieldLabel>
  <Select value={selectedValue} onValueChange={handleChange}>
    <SelectTrigger>
      <SelectValue placeholder={t("select_option")} />
    </SelectTrigger>
    <SelectPopup>
      {options.map((opt) => (
        <SelectItem key={opt.value} value={opt.value}>
          {opt.label}
        </SelectItem>
      ))}
    </SelectPopup>
  </Select>
</Field>
```

### After (with Controller + items prop)

When integrating with RHF and when options are objects:

```tsx
<Controller
  name="expiresAt"
  control={form.control}
  render={({
    field: { name, value, onBlur, onChange },
    fieldState: { invalid },
  }) => (
    <Field className="mt-4" name={name} invalid={invalid}>
      <FieldLabel>{t("expire_date")}</FieldLabel>
      <Select
        aria-label={t("expire_date")}
        items={selectItems}
        name={name}
        onOpenChange={(open) => {
          if (!open) onBlur();
        }}
        value={getSelectValue(value)}
        onValueChange={(val) => {
          const option = options[Number(val)];
          if (option) onChange(option.value);
        }}>
        <SelectTrigger className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectPopup>
          {options.map((option, index) => (
            <SelectItem key={option.label} value={String(index)}>
              {option.label}
            </SelectItem>
          ))}
        </SelectPopup>
      </Select>
      <FieldDescription>
        {t("expires_on")} <span className="font-medium">{formatDate(value)}</span>
      </FieldDescription>
    </Field>
  )}
/>
```

Key Select props:
- `items` — Array of `{ label, value }` for accessibility announcements
- `aria-label` — Accessible name when not associated with a `FieldLabel`
- `onOpenChange` — Use `if (!open) onBlur()` to trigger RHF validation on close
- `onValueChange` — String callback (unlike old react-select which passed the option object)

### Select with object values

When the `Select` value is an object (not a string):

```tsx
<Select
  items={timeoutOptions}
  value={selectedTimeoutOption}
  onValueChange={(value) => setSessionTimeout(value?.value)}>
  <SelectTrigger className="w-auto">
    <SelectValue placeholder={defaultOption.label} />
  </SelectTrigger>
  <SelectPopup>
    {timeoutOptions.map((option) => (
      <SelectItem key={option.value} value={option}>
        {option.label}
      </SelectItem>
    ))}
  </SelectPopup>
</Select>
```

## Collapsible + Switch Pattern

A common pattern for "toggle reveals more fields" uses `Collapsible` with `CollapsibleTrigger` rendered as a `Switch`:

### In a Field context (e.g., "Never expires" toggle)

```tsx
import { Collapsible, CollapsiblePanel, CollapsibleTrigger } from "@coss/ui/components/collapsible";
import { Switch } from "@coss/ui/components/switch";
import { Field, FieldLabel } from "@coss/ui/components/field";

<Controller
  name="neverExpires"
  control={form.control}
  render={({ field: { name, value, onBlur, onChange }, fieldState: { invalid } }) => (
    <Collapsible onOpenChange={(open) => onChange(!open)} open={!value}>
      <Field name={name} invalid={invalid}>
        <FieldLabel>
          <CollapsibleTrigger
            nativeButton={false}
            render={
              <Switch
                checked={value}
                onBlur={onBlur}
                onCheckedChange={(checked) => onChange(checked === true)}
              />
            }
          />
          {t("never_expires")}
        </FieldLabel>
      </Field>
      <CollapsiblePanel>
        {/* fields revealed when toggle is off (i.e., Collapsible is open) */}
      </CollapsiblePanel>
    </Collapsible>
  )}
/>
```

Key details:
- `nativeButton={false}` — Required because `Switch` already renders a button
- `render={<Switch ... />}` — The render prop delegates the trigger behavior to the Switch
- Invert logic: `open={!value}` so the panel shows when the toggle is *off*
- Use `onCheckedChange={(checked) => onChange(checked === true)}` to coerce to boolean

### In a CardFrame context (e.g., settings toggle)

```tsx
<CardFrame
  className="has-[[data-slot=collapsible-trigger][data-unchecked]]:before:bg-card before:transition-all"
  render={
    <Collapsible open={isEnabled} onOpenChange={handleToggle} />
  }>
  <CardFrameHeader>
    <CardFrameTitle>{t("session_timeout")}</CardFrameTitle>
    <CardFrameDescription>{t("description")}</CardFrameDescription>
    <CardFrameAction>
      <CollapsibleTrigger
        nativeButton={false}
        render={
          <Switch
            checked={isEnabled}
            onCheckedChange={handleToggle}
            aria-label={t("session_timeout")}
          />
        }
      />
    </CardFrameAction>
  </CardFrameHeader>

  <Card render={<CollapsiblePanel className="data-ending-style:opacity-0 data-starting-style:opacity-0 transition-[height,opacity]" />}>
    <CardPanel>
      {/* revealed settings content */}
    </CardPanel>
  </Card>
</CardFrame>
```

Note the animation classes on `CollapsiblePanel`: `data-ending-style:opacity-0 data-starting-style:opacity-0 transition-[height,opacity]` for smooth expand/collapse with fade.

## Switch

### Before

```tsx
import { Switch } from "@calcom/ui";

<Switch checked={value} onCheckedChange={onChange} />
```

### After

```tsx
import { Switch } from "@coss/ui/components/switch";

<Switch checked={value} onCheckedChange={onChange} />
```

The API is similar but the DOM attributes differ: `data-state="checked"` becomes `data-checked` / `data-unchecked`. CSS selectors targeting the old attributes must be updated.

## CheckboxField to Checkbox

### Before

```tsx
import { CheckboxField } from "@calcom/ui";

<CheckboxField label={t("agree")} {...register("agree")} />
```

### After

```tsx
import { Checkbox } from "@coss/ui/components/checkbox";
import { Label } from "@coss/ui/components/label";

<Controller
  name="agree"
  control={control}
  render={({ field }) => (
    <div className="flex items-center gap-2">
      <Checkbox checked={field.value} onCheckedChange={field.onChange} />
      <Label>{t("agree")}</Label>
    </div>
  )}
/>
```

## Slider

Value API changes from scalar to array:

```tsx
// Before
<Slider value={zoom} onChange={setZoom} />

// After
<Slider value={[zoom]} onValueChange={([val]) => setZoom(val)} />
```

## InputOTP

For OTP / 2FA code entry:

```tsx
import { REGEXP_ONLY_DIGITS } from "input-otp";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@coss/ui/components/input-otp";

<Field name="totpCode" invalid={!!errorMessage}>
  <FieldLabel htmlFor="totpCode">{t("2fa_code")}</FieldLabel>
  <InputOTP
    id="totpCode"
    aria-label={t("2fa_code")}
    autoFocus
    autoComplete="one-time-code"
    inputMode="numeric"
    maxLength={6}
    pattern={REGEXP_ONLY_DIGITS}
    value={totpCode}
    onChange={(value) => {
      setTotpCode(value);
      if (value.trim().length === 6) {
        void handleSubmit(undefined, value);
      }
    }}>
    <InputOTPGroup size="lg">
      <InputOTPSlot index={0} />
      <InputOTPSlot index={1} />
      <InputOTPSlot index={2} />
      <InputOTPSlot index={3} />
      <InputOTPSlot index={4} />
      <InputOTPSlot index={5} />
    </InputOTPGroup>
  </InputOTP>
  <FieldDescription>{t("2fa_enabled_instructions")}</FieldDescription>
  <FieldError match={!!errorMessage}>{errorMessage}</FieldError>
</Field>
```

Key details:
- `InputOTPGroup` accepts a `size` prop (`"lg"` for large display)
- Import `REGEXP_ONLY_DIGITS` from `"input-otp"` (peer package)
- Wrap in `Field` with `name` and `invalid` for validation state
- Use `FieldDescription` for helper text
- Auto-submit on completion: check length in `onChange` callback
- Keep `maxLength` synchronized with rendered `InputOTPSlot` count

## ToggleGroup to Tabs

For mode selectors (e.g., invite by email vs link):

```tsx
// Before
<ToggleGroup value={mode} onValueChange={setMode}>
  <ToggleGroupItem value="email">{t("email")}</ToggleGroupItem>
  <ToggleGroupItem value="link">{t("link")}</ToggleGroupItem>
</ToggleGroup>

// After
<Tabs value={mode} onValueChange={setMode}>
  <TabsList>
    <TabsTrigger value="email">{t("email")}</TabsTrigger>
    <TabsTrigger value="link">{t("link")}</TabsTrigger>
  </TabsList>
</Tabs>
```

## Textarea

```tsx
// Before
import { TextArea } from "@calcom/ui";
<TextArea {...register("description")} placeholder={t("description")} />

// After
import { Textarea } from "@coss/ui/components/textarea";
<Textarea {...register("description")} placeholder={t("description")} />
```

Note the casing change: `TextArea` → `Textarea`.

## Troubleshooting

### Base UI Form blocks submission

**Symptom**: A form's submit button stops working after wrapping with Base UI `<Form>`. The `onSubmit` handler never fires.

**Root cause**: Base UI `<Form>` validates all registered `Field` components before submitting. If any field is invalid — or if fields from a child dialog "leak" into the form's validation scope — submission is blocked silently.

**Solution**: Use a native `<form>` element when you don't need Base UI's field-level validation. Reserve Base UI `<Form>` only for forms that actually use `Field` / `FieldError` for validation:

```tsx
// Before (broken — Form blocks submit):
<Form onSubmit={handleFinish}>
  <WizardStepContent />
  <Button type="submit">Finish</Button>
</Form>

// After (works — native form doesn't interfere):
<form onSubmit={handleFinish}>
  <WizardStepContent />
  <Button type="submit">Finish</Button>
</form>
```

### FieldControl is only for native HTML elements

**Never** wrap coss-ui components (`Input`, `Textarea`, `Select`, etc.) with `FieldControl`. They already contain `Field.Control` internally — double-wrapping causes duplicate field registration, breaking focus and validation.

```tsx
// Correct — coss-ui components register themselves
<Field name="key">
  <Input />
</Field>

// Correct — FieldControl for a raw native element
<Field name="key">
  <FieldControl render={<input />} />
</Field>

// Wrong — double registration
<Field name="key">
  <FieldControl render={<Input />} />
</Field>
```
