# coss Alert

## When to use

- Inline status messaging in content flows.
- Semantic feedback variants (`info`, `success`, `warning`, `error`) with optional icons and actions.

## When NOT to use

- If the message is transient and should auto-dismiss -> use Toast instead.
- If the message requires user action before proceeding -> use AlertDialog instead.
- If it's a brief hover hint -> use Tooltip instead.

## Install

```bash
npx shadcn@latest add @coss/alert
```

Manual deps from docs:

```bash
# No extra runtime dependency required for this primitive.
```

## Canonical imports

```tsx
import { Alert, AlertAction, AlertDescription, AlertTitle } from "@/components/ui/alert"
```

## Minimal pattern

```tsx
<Alert>
  <AlertTitle>Heads up!</AlertTitle>
  <AlertDescription>
    You can add components and dependencies to your app using the cli.
  </AlertDescription>
</Alert>
```

## Patterns from coss particles

### Key patterns

Alert with semantic icon (do NOT use `aria-hidden` — icon conveys status):

```tsx
<Alert variant="info">
  <InfoIcon />
  <AlertTitle>Heads up!</AlertTitle>
  <AlertDescription>You can add components using the CLI.</AlertDescription>
</Alert>
```

Variants: `default`, `info`, `success`, `warning`, `error`.

Alert with action buttons (use `AlertAction`):

```tsx
<Alert>
  <InfoIcon />
  <AlertTitle>Heads up!</AlertTitle>
  <AlertDescription>Describe what can be done about it here.</AlertDescription>
  <AlertAction>
    <Button size="xs" variant="ghost">Dismiss</Button>
    <Button size="xs">Ok</Button>
  </AlertAction>
</Alert>
```

### More examples

See `p-alert-1` through `p-alert-7` for all variants and action patterns.

## Common pitfalls

- Using alert variants for passive decoration instead of meaningful semantic status.
- Missing title/description structure in complex alerts, reducing scannability.
- Hiding semantic alert icons with `aria-hidden` when they convey status meaning.

## Useful particle references

- with icon: `p-alert-2`
- with icon and action buttons: `p-alert-3`
- info alert: `p-alert-4`
- success alert: `p-alert-5`
- warning alert: `p-alert-6`
- error alert: `p-alert-7`
