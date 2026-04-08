# Dialogs & Overlays Migration

## Dialog + DialogContent to Dialog + DialogPopup

The old `DialogContent` splits into `DialogPopup` (the modal container) with `DialogHeader` and `DialogPanel` (the body).

### Before

```tsx
import { Dialog, DialogContent, DialogFooter } from "@calcom/ui";

<Dialog open={open} onOpenChange={setOpen}>
  <DialogContent title={t("edit_item")} description={t("edit_desc")}>
    {/* form content */}
    <DialogFooter>
      <Button onClick={handleClose}>{t("cancel")}</Button>
      <Button type="submit">{t("save")}</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

### After

```tsx
import {
  Dialog,
  DialogPopup,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogPanel,
  DialogFooter,
  DialogClose,
} from "@coss/ui/components/dialog";

<Dialog
  open={open}
  onOpenChange={setOpen}
  onOpenChangeComplete={(open) => {
    if (!open) resetFormState();
  }}>
  <DialogPopup>
    <DialogHeader>
      <DialogTitle>{t("edit_item")}</DialogTitle>
      <DialogDescription>{t("edit_desc")}</DialogDescription>
    </DialogHeader>
    <DialogPanel>
      <div className="flex flex-col gap-4">
        {/* form content */}
      </div>
    </DialogPanel>
    <DialogFooter>
      <DialogClose render={<Button variant="ghost" />}>
        {t("cancel")}
      </DialogClose>
      <Button type="submit" loading={isPending}>
        {t("save")}
      </Button>
    </DialogFooter>
  </DialogPopup>
</Dialog>
```

## Key Dialog Rules

1. **Cancel buttons use `variant="ghost"`** — always, via `DialogClose render={<Button variant="ghost" />}`.
2. **Use `onOpenChangeComplete`** for state resets (form values, step counters). This fires after the close animation completes, preventing visual drifts. Use `onOpenChange` only for the `open` state itself.
3. **Do not add layout classes to `DialogPanel` directly.** Wrap content in an inner `<div>` for spacing.

## Form-in-Dialog Pattern

When a dialog contains a form, the `<Form>` (or `<form>`) must wrap both `DialogPanel` and `DialogFooter` so the submit button is inside the form. Use `className="contents"` to prevent the form element from breaking dialog layout:

```tsx
<Dialog open={open} onOpenChange={setOpen} onOpenChangeComplete={(o) => { if (!o) form.reset(); }}>
  <DialogPopup>
    <DialogHeader>
      <DialogTitle>{t("create_item")}</DialogTitle>
      <DialogDescription>{t("create_desc")}</DialogDescription>
    </DialogHeader>
    <Form className="contents" onSubmit={form.handleSubmit(onSubmit)}>
      <DialogPanel>
        <div className="flex flex-col gap-4">
          {/* form fields */}
        </div>
      </DialogPanel>
      <DialogFooter>
        <DialogClose render={<Button variant="ghost" />}>{t("cancel")}</DialogClose>
        <Button type="submit" loading={form.formState.isSubmitting}>
          {t("save")}
        </Button>
      </DialogFooter>
    </Form>
  </DialogPopup>
</Dialog>
```

The `className="contents"` is critical — it makes the `<form>` element invisible to CSS layout, so `DialogPanel` and `DialogFooter` remain direct layout children of `DialogPopup`.

When `<Form>` wraps only some steps (e.g., in a multi-step dialog), apply it per-step:

```tsx
{step === "password" && (
  <Form className="contents" onSubmit={handlePasswordSubmit}>
    <DialogPanel>{/* ... */}</DialogPanel>
    <DialogFooter>{/* ... */}</DialogFooter>
  </Form>
)}
{step === "qrcode" && (
  <>
    <DialogPanel>{/* no form needed */}</DialogPanel>
    <DialogFooter>{/* ... */}</DialogFooter>
  </>
)}
```

## DialogPopup Props

`DialogPopup` accepts several props for customizing behavior:

```tsx
<DialogPopup
  showCloseButton={false}         // Hide the built-in X button (useful for wizard flows)
  bottomStickOnMobile={false}     // Prevent sheet-like behavior on mobile
  className="max-w-xl"            // Control max width (default is smaller)
>
```

Common width classes: `max-w-sm` (small), default (medium), `max-w-xl` (large), `max-w-2xl` (extra large).

## DialogClose Variations

`DialogClose` renders a button that closes the dialog. The `render` prop controls the button appearance:

```tsx
// Cancel button (secondary action) — always ghost
<DialogClose render={<Button variant="ghost" />}>{t("cancel")}</DialogClose>

// Done button (primary action when close IS the main action)
<DialogClose render={<Button />}>{t("done")}</DialogClose>

// Done with side effects
<DialogClose render={<Button variant="ghost" data-testid="close-btn" onClick={() => onComplete()} />}>
  {t("close")}
</DialogClose>
```

## ConfirmationDialogContent to AlertDialog

Destructive/critical confirmation dialogs use a separate primitive.

### Before

```tsx
import { Dialog, ConfirmationDialogContent } from "@calcom/ui";

<Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
  <ConfirmationDialogContent
    title={t("confirm_delete")}
    confirmBtnText={t("delete")}
    onConfirm={handleDelete}
    variety="danger">
    {t("delete_message")}
  </ConfirmationDialogContent>
</Dialog>
```

### After

```tsx
import {
  AlertDialog,
  AlertDialogPopup,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogClose,
} from "@coss/ui/components/alert-dialog";

<AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
  <AlertDialogPopup>
    <AlertDialogHeader>
      <AlertDialogTitle>{t("confirm_delete")}</AlertDialogTitle>
      <AlertDialogDescription>{t("delete_message")}</AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogClose render={<Button variant="ghost" />}>
        {t("cancel")}
      </AlertDialogClose>
      <Button variant="destructive" onClick={handleDelete} loading={isPending}>
        {t("delete")}
      </Button>
    </AlertDialogFooter>
  </AlertDialogPopup>
</AlertDialog>
```

## Sheet to Drawer

Prefer `Drawer` over `Sheet` for side/bottom panels.

### Before

```tsx
import { Sheet, SheetBody } from "@calcom/ui";

<Sheet open={open} onOpenChange={setOpen}>
  <SheetBody>
    {/* content */}
  </SheetBody>
</Sheet>
```

### After

```tsx
import { Drawer, DrawerPopup, DrawerPanel, DrawerClose } from "@coss/ui/components/drawer";

<Drawer open={open} onOpenChange={setOpen}>
  <DrawerPopup>
    <DrawerPanel>
      <div className="flex flex-col gap-4">
        {/* content */}
      </div>
    </DrawerPanel>
  </DrawerPopup>
</Drawer>
```

## Sibling Dialog Rule

When migrating multi-step flows or flows with nested modals:

1. **Can the user go back from dialog B to dialog A?**
   - **Yes** — Use a nested dialog (dialog B opens inside/from dialog A).
   - **No** — Use a single `Dialog.Root` and switch content based on `step` state. This avoids the backdrop crossfade glitch.
   - **Otherwise** — Use adjacent (sibling) dialogs as a last resort.

### Single dialog with content switching (preferred for wizard flows)

```tsx
type SetupStep = "password" | "qrcode" | "totp" | "done";
const [step, setStep] = useState<SetupStep>("password");

const handleOpenChange = (nextOpen: boolean) => {
  if (!nextOpen) onClose();
};

const handleOpenChangeComplete = (nextOpen: boolean) => {
  if (!nextOpen) {
    setStep("password");
    // reset all other state here
  }
};

<Dialog open={open} onOpenChange={handleOpenChange} onOpenChangeComplete={handleOpenChangeComplete}>
  <DialogPopup showCloseButton={false}>
    <DialogHeader>
      <DialogTitle>{step === "done" ? t("done_title") : t("setup_title")}</DialogTitle>
      <DialogDescription>{stepDescriptions[step]}</DialogDescription>
    </DialogHeader>

    {step === "password" && (
      <Form className="contents" onSubmit={handlePasswordSubmit}>
        <DialogPanel>
          {/* password field */}
        </DialogPanel>
        <DialogFooter>
          <DialogClose render={<Button variant="ghost" />}>{t("cancel")}</DialogClose>
          <Button type="submit" loading={isSubmitting}>{t("continue")}</Button>
        </DialogFooter>
      </Form>
    )}

    {step === "qrcode" && (
      <>
        <DialogPanel>
          {/* QR code display */}
        </DialogPanel>
        <DialogFooter>
          <DialogClose render={<Button variant="ghost" />}>{t("cancel")}</DialogClose>
          <Button onClick={() => setStep("totp")}>{t("continue")}</Button>
        </DialogFooter>
      </>
    )}

    {step === "done" && (
      <>
        <DialogPanel>{/* success content */}</DialogPanel>
        <DialogFooter>
          <DialogClose render={<Button />}>{t("done")}</DialogClose>
        </DialogFooter>
      </>
    )}
  </DialogPopup>
</Dialog>
```

Key patterns in multi-step dialogs:
- Separate `onOpenChange` (for `open` state) from `onOpenChangeComplete` (for resetting step/form state)
- Each step can have its own `<Form className="contents">` wrapper or use a bare `<>` fragment
- The `DialogHeader` is typically shared across steps with dynamic title/description
- Use `showCloseButton={false}` when steps have explicit cancel buttons

## Content Switching vs State Reset

When a dialog shows different content based on success/failure (e.g., "create form" → "success with API key"):

```tsx
{successfulNewApiKeyModal ? (
  <>
    <DialogHeader>
      <DialogTitle>{t("success_api_key_created")}</DialogTitle>
    </DialogHeader>
    <DialogPanel>
      {/* success content, e.g., CopyableField */}
    </DialogPanel>
    <DialogFooter>
      <DialogClose render={<Button />}>{t("done")}</DialogClose>
    </DialogFooter>
  </>
) : (
  <Form className="contents" onSubmit={form.handleSubmit(onSubmit)}>
    <DialogHeader>
      <DialogTitle>{t("create_item")}</DialogTitle>
    </DialogHeader>
    <DialogPanel>{/* form fields */}</DialogPanel>
    <DialogFooter>
      <DialogClose render={<Button variant="ghost" />}>{t("cancel")}</DialogClose>
      <Button type="submit" loading={form.formState.isSubmitting}>{t("create")}</Button>
    </DialogFooter>
  </Form>
)}
```

## DialogTrigger with render prop

When the trigger is a custom component:

```tsx
// Before (asChild pattern)
<DialogTrigger asChild>
  <Button variant="outline">Open</Button>
</DialogTrigger>

// After (render prop pattern)
<DialogTrigger render={<Button variant="outline" />}>Open</DialogTrigger>
```

## Anchored Toast in Dialogs

For contextual feedback anchored to a specific element (e.g., a copy button):

```tsx
import { anchoredToastManager } from "@coss/ui/components/toast";

const buttonRef = useRef<HTMLButtonElement>(null);

// On action:
anchoredToastManager.add({
  data: { tooltipStyle: true },
  positionerProps: { anchor: buttonRef.current },
  timeout: 2000,
  title: t("copied"),
});
```

Use `anchoredToastManager` for tooltip-style feedback near a trigger. Use `toastManager` for global notifications.

## Troubleshooting

### Dialog closes when a Radix Popover is opened inside it

**Symptom**: A Base UI `Dialog` closes when you open a Radix `Popover` inside it and then click anywhere.

**Root cause**: Radix popovers render in a portal outside the dialog DOM tree. Base UI's outside-interaction detection sees clicks in the Radix portal as outside the dialog.

**Solution**: Track the Radix popover's open state and pass `disablePointerDismissal` to the dialog:

```tsx
const [isPopoverOpen, setIsPopoverOpen] = useState(false);

<Dialog open={open} disablePointerDismissal={isPopoverOpen} onOpenChange={onOpenChange}>
  <DialogPopup>
    <RadixDateRangePicker onPopoverOpenChange={setIsPopoverOpen} />
  </DialogPopup>
</Dialog>
```

### Infinite loop with lazy-loaded components inside Dialog

**Symptom**: `Maximum update depth exceeded` when opening a dialog containing a `next/dynamic` component.

**Root cause**: `next/dynamic` async mounting conflicts with Base UI Dialog's portal mounting, causing infinite re-renders.

**Solution**: Import the component directly without the lazy wrapper:

```tsx
// Instead of:
import { DateRangePicker } from "@calcom/ui/components/form";

// Use direct import:
import { DatePickerWithRange as DateRangePicker } from "@calcom/ui/components/form/date-range-picker/DateRangePicker";
```

### Sheet/Dialog transition missing on first open

**Symptom**: No slide-in/fade-in animation the first time a Dialog or Drawer opens, but works on subsequent opens.

**Root cause**: The component is conditionally rendered (`{flag && <Sheet />}`), so it mounts with `open={true}` on first render. Base UI skips the enter animation when initialized with `open={true}`.

**Solution**: Always render unconditionally and make data props nullable:

```tsx
// Before (broken transitions):
{selectedItem && <EditSheet item={selectedItem} open={sheetOpen} onOpenChange={setSheetOpen} />}

// After (transitions work correctly):
<EditSheet item={selectedItem} open={sheetOpen} onOpenChange={setSheetOpen} />
// Make `item` prop nullable and guard queries with `enabled: !!item`
```

### Defer queries in conditionally-visible dialogs

When a dialog is always mounted but only visible when toggled, gate any `useQuery` calls with `enabled: isOpen` to prevent unnecessary API calls on page load:

```tsx
const locationsQuery = trpc.viewer.apps.locationOptions.useQuery(
  { teamId },
  { enabled: hasOrganizer && isOpenDialog }
);
```
