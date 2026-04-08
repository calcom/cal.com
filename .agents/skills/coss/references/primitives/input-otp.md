# coss Input Otp

## When to use

- One-time passcode entry with segmented slots.
- Verification code flows with strict length formatting.

## Install

```bash
npx shadcn@latest add @coss/input-otp
```

Manual deps from docs:

```bash
npm install @base-ui/react input-otp lucide-react
```

## Canonical imports

```tsx
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSeparator,
  InputOTPSlot,
} from "@/components/ui/input-otp"
```

## Minimal pattern

```tsx
<InputOTP aria-label="Verification code" maxLength={6}>
  <InputOTPGroup>
    <InputOTPSlot index={0} />
    <InputOTPSlot index={1} />
    <InputOTPSlot index={2} />
  </InputOTPGroup>
  <InputOTPSeparator />
  <InputOTPGroup>
    <InputOTPSlot index={3} />
    <InputOTPSlot index={4} />
    <InputOTPSlot index={5} />
  </InputOTPGroup>
</InputOTP>
```

## Patterns from coss particles

### Key patterns

OTP with label and controlled value:

```tsx
const [value, setValue] = useState("")

<div className="flex flex-col gap-2">
  <Label>Verification code</Label>
  <InputOTP maxLength={6} value={value} onChange={setValue}>
    <InputOTPGroup>
      <InputOTPSlot index={0} />
      <InputOTPSlot index={1} />
      <InputOTPSlot index={2} />
    </InputOTPGroup>
    <InputOTPSeparator />
    <InputOTPGroup>
      <InputOTPSlot index={3} />
      <InputOTPSlot index={4} />
      <InputOTPSlot index={5} />
    </InputOTPGroup>
  </InputOTP>
</div>
```

Digits only: add `inputMode="numeric" pattern={REGEXP_ONLY_DIGITS}`.

Ensure slot count matches `maxLength`.

### More examples

See `p-input-otp-1` through `p-input-otp-7` for sizes, separators, label, digits-only, invalid, and auto-validation patterns.

## Common pitfalls

- Slot count mismatch with `maxLength`, causing broken OTP UX.
- Missing `aria-label` when no visible label is present.
- Using OTP slots for arbitrary text input instead of fixed verification codes.

## Useful particle references

- large: `p-input-otp-2`
- with separator: `p-input-otp-3`
- with label: `p-input-otp-4`
- digits only: `p-input-otp-5`
- invalid: `p-input-otp-6`
- auto validation: `p-input-otp-7`
