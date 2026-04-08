# coss Alert Dialog

## When to use

- Critical confirmation flows before destructive actions.
- Blocking decisions that require explicit acknowledgement.

## When NOT to use

- If the content is informational (no destructive action) -> use Dialog instead.
- If the message is transient feedback -> use Toast instead.
- If the content is contextual and non-blocking -> use Popover instead.

## Install

```bash
npx shadcn@latest add @coss/alert-dialog
```

Manual deps from docs:

```bash
npm install @base-ui/react
```

## Canonical imports

```tsx
import {
  AlertDialog,
  AlertDialogClose,
  AlertDialogDescription,
  AlertDialogPanel,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogPopup,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
```

## Minimal pattern

```tsx
<AlertDialog>
  <AlertDialogTrigger render={<Button variant="destructive-outline" />}>
    Delete Account
  </AlertDialogTrigger>
  <AlertDialogPopup>
    <AlertDialogHeader>
      <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
      <AlertDialogDescription>
        This action cannot be undone.
      </AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogClose render={<Button variant="ghost" />}>Cancel</AlertDialogClose>
      <AlertDialogClose render={<Button variant="destructive" />}>
        Delete Account
      </AlertDialogClose>
    </AlertDialogFooter>
  </AlertDialogPopup>
</AlertDialog>
```

## Patterns from coss particles

- **Section structure invariant**: keep `AlertDialogHeader`, optional `AlertDialogPanel`, and `AlertDialogFooter` as direct sections of `AlertDialogPopup`.
- **Action composition**: use `AlertDialogClose render={<Button ... />}` for cancel/confirm actions to preserve button semantics and styling.
- **Destructive affordance**: pair destructive trigger/confirm variants (`destructive-outline`, `destructive`) for clear risk signaling.
- **Footer variants**: use `AlertDialogFooter variant="bare"` when border/background framing should be removed.
- **Close confirmation chain**: for unsaved changes in broader workflows, pair with dialog flows like `p-dialog-4`.

## Common pitfalls

- Using AlertDialog as a generic content modal instead of high-risk confirmation UI.
- Omitting explicit destructive/cancel action distinction.
- Wrapping dialog sections in extra containers that break built-in layout (use `className="contents"` only when needed).
- Mixing Dialog/Popover composition APIs without validating this primitive's parts.
- Skipping focus-return and escape-key verification on real trigger flows.

## Useful particle references

- core alert-dialog patterns: `p-alert-dialog-1`, `p-alert-dialog-2`
- related close-confirmation flow: `p-dialog-4`
