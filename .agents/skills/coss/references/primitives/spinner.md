# coss Spinner

## When to use

- Indeterminate loading indicator for ongoing work.
- Inline pending state in buttons, forms, and async panels.

## Install

```bash
npx shadcn@latest add @coss/spinner
```

Manual deps from docs:

```bash
# No extra runtime dependency required for this primitive.
```

## Canonical imports

```tsx
import { Spinner } from "@/components/ui/spinner"
```

## Minimal pattern

```tsx
<div className="flex items-center gap-2">
  <Spinner aria-label="Loading" />
  <span className="text-sm text-muted-foreground">Loading data…</span>
</div>
```

## Patterns from coss particles

### Key patterns

Spinner inside a button:

```tsx
<Button disabled>
  <Spinner aria-hidden="true" />
  Loading...
</Button>
```

Standalone spinner with label:

```tsx
<div className="flex items-center gap-2">
  <Spinner aria-label="Loading" />
  <span className="text-muted-foreground text-sm">Fetching data...</span>
</div>
```

Prefer button built-in loading UI where available over ad-hoc spinner wrappers.

### More examples

See `p-button-18` and `p-input-12` for spinner-in-button and spinner-in-input-group patterns.

## Common pitfalls

- Using spinner without accessible label/context for screen readers.
- Showing spinner with no cancel/retry pathway in long-running operations.
- Using spinner when determinate progress value is available.

## Useful particle references

- input group: `p-input-12`
- button: `p-button-18`
- cross-primitive pending states: `p-button-25`, `p-autocomplete-12`, `p-toast-3`
