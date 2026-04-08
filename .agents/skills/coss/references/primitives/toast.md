# coss Toast

## Architecture note

- coss toast is built on Base UI toast primitives, not shadcn Sonner internals.
- Do not assume Sonner-style APIs/options map 1:1.
- This is not Sonner's `toast()` + `<Toaster />` API model; use `toastManager` / `anchoredToastManager` with coss providers.

## When to use

- Temporary in-app feedback notifications.
- Anchored contextual toasts tied to a target element.

## When NOT to use

- If the message requires user acknowledgment before proceeding -> use AlertDialog instead.
- If the feedback is inline and persistent -> use Alert instead.
- If the notification is anchored to a specific element without toastManager -> use Tooltip or Popover instead.

## Install

```bash
npx shadcn@latest add @coss/toast
```

Manual deps:

```bash
npm install @base-ui/react
```

## Required app setup

Add providers in app layout:

```tsx
import { AnchoredToastProvider, ToastProvider } from "@/components/ui/toast"
```

Wrap app content with both:

```tsx
<ToastProvider>
  <AnchoredToastProvider>{children}</AnchoredToastProvider>
</ToastProvider>
```

## Canonical imports

```tsx
import {
  AnchoredToastProvider,
  ToastProvider,
  anchoredToastManager,
  toastManager,
} from "@/components/ui/toast"
```

## Minimal pattern

```tsx
toastManager.add({
  title: "Saved",
  description: "Your changes have been updated.",
})
```

## Patterns from coss particles

- **Stacked notifications**: use `toastManager.add(...)` for global app feedback with typed variants and optional actions.
- **Anchored notifications**: use `anchoredToastManager.add(...)` with `positionerProps.anchor` for contextual, element-tied toasts.
- **Lifecycle-driven flows**: use loading/promise patterns and explicit close/update handling for async operations.

## Stacked usage

```tsx
import { toastManager } from "@/components/ui/toast"

toastManager.add({
  title: "Event has been created",
  description: "Monday, January 3rd at 6:00pm",
})
```

## Anchored usage

```tsx
import { anchoredToastManager } from "@/components/ui/toast"

anchoredToastManager.add({
  title: "Copied!",
  positionerProps: { anchor: buttonRef.current },
})
```

## Common pitfalls

- Forgetting provider setup before calling managers.
- Using anchored toasts without a valid `anchor`.
- Assuming tooltip-style anchored toasts show full content (only title is shown with `tooltipStyle`).
- Copy/pasting Sonner examples (`toast(...)` options shape) without adapting to `toastManager` / `anchoredToastManager`.

## Useful particle references

- basic toast add flow: `p-toast-1`
- typed feedback variants (`success`/`error`/`info`/`warning`): `p-toast-2`
- loading toast: `p-toast-3`
- action/undo flow with `actionProps`: `p-toast-4`
- promise-driven lifecycle toasts: `p-toast-5`, `p-toast-9`
- custom content payload pattern: `p-toast-6`
- anchored tooltip-style confirmation: `p-toast-7`
- anchored error toast with manual lifecycle handling: `p-toast-8`
- anchored toast pattern in a non-toast primitive: `p-toggle-8`

