---
title: "`@coss/ui` Migration Guide"
description: "Entry point for migrating to `@coss/ui` (Base UI), with troubleshooting, dos and don'ts, and links to component-level guides."
---

## Start Here

This is the entry point for migrating to `@coss/ui`. It covers shared guidance, pitfalls, and troubleshooting. For component-by-component details and Radix/shadcn patterns, use the general guide:

- [Radix / shadcn migration guide](radix_shadcn_migration_guide.md)

## Quick Checklist

- Identify all `@calcom/ui` usages in the scope of the migration.
- Replace Radix `asChild` with Base UI `render` where needed.
- Update naming differences (`*Content` → `*Popup`/`*Panel`).
- Map `@calcom/ui` component props to their `@coss/ui` equivalents (see [Component Mapping Reference](#component-mapping-reference)).
- Update CSS token classes (see [CSS Token Changes](#css-token-changes)).
- Replace `showToast()` calls with `toastManager.add()`.
- Replace `cs` (calcom classname util) with `cn` (coss classname util).
- Validate dialog, menu, and popover behavior (portals and focus).
- Run type checks and targeted UI smoke tests.

## Do and Don't

**Do**
- Prefer Base UI mental models: `render` for composability, `*Popup`/`*Panel` for content.
- Use direct component imports instead of barrel imports.
- Keep diffs small and scoped to a single feature or page.
- When converting a shared component, audit other pages/components that consume it and either migrate them in the same PR or explicitly test them.
- Always render Sheet/Dialog components unconditionally and control visibility via the `open` prop (see [Sheet/Dialog slide-in transition missing on first open](#sheetdialog-slide-in-transition-missing-on-first-open)).
- Use `onOpenChangeComplete` to clean up data after a dialog/sheet close animation finishes, rather than cleaning up in `onOpenChange`.
- Add a `ToastProvider` wrapper in your app tree when migrating to `toastManager`.

**Don't**
- Don't keep lazy-loaded components inside Base UI dialogs without verifying render behavior.
- Don't rely on Radix-specific props (`asChild`, `type="single"`, `collapsible`) without mapping them.
- Don't assume API parity; check the component guide first.
- Don't over-migrate in a single change; prioritize targeted conversions and verification.
- Don't conditionally render Sheet or Dialog components (e.g. `{flag && <Sheet />}`); this breaks enter transitions.
- Don't use Base UI `<Form>` as a generic form wrapper; it intercepts submission with validation logic (see [Base UI Form blocks submission in non-validation contexts](#base-ui-form-blocks-submission-in-non-validation-contexts)).

## Knowledge Base

### Base UI vs Radix UI mental model

`@coss/ui` is built on Base UI from the ground up. Many component names are similar, but the APIs are not drop-in compatible. Base UI favors `render` props for composition and often exposes `*Popup` or `*Panel` instead of `*Content`.

### Render vs asChild

Radix's `asChild` becomes Base UI's `render`. This affects triggers, close buttons, and other slots that used to render children directly.

### Naming conventions

Common renames to expect:

- `DialogContent` → `DialogPopup`
- `AlertDialogContent` → `AlertDialogPopup`
- `AccordionContent` → `AccordionPanel`
- `SheetContent` → `SheetPopup`
- `SheetBody` → `SheetPanel`

Legacy names may remain for compatibility, but new usage should follow Base UI naming.

### Component Mapping Reference

This table summarizes common `@calcom/ui` → `@coss/ui` component replacements discovered during migration:

| `@calcom/ui` | `@coss/ui` |
|---|---|
| `Button` (`color="secondary"`) | `Button` (`variant="outline"`) |
| `Button` (`color="minimal"`) | `Button` (`variant="ghost"`) |
| `Button` (`loading` prop) | `Button` (inline pending text, e.g. `{isPending ? "..." : label}`) |
| `Badge` (`green` variant) | `Badge` (`success` variant) |
| `Badge` (`gray` variant) | `Badge` (`secondary` variant) |
| `Badge` (`blue` variant) | `Badge` (`info` variant) |
| `showToast(msg, type)` | `toastManager.add({ title, type })` |
| `Dialog` + `ConfirmationDialogContent` | `AlertDialog` + `AlertDialogPopup` composition |
| `Dialog` + `DialogContent` | `Dialog` + `DialogPopup` + `DialogHeader` + `DialogPanel` |
| `Sheet` / `SheetContent` / `SheetBody` | `Sheet` / `SheetPopup` / `SheetPanel` + `SheetClose` |
| `TextField` | `Input` + `Field` / `FieldLabel` / `FieldControl` / `FieldError` |
| `TextField` (`addOnLeading`) | `InputGroup` / `InputGroupAddon` / `InputGroupInput` / `InputGroupText` |
| `PanelCard` | `CardFrame` / `CardFrameHeader` / `CardFrameTitle` / `Card` / `CardPanel` |
| `PanelCard` (`collapsible`) | `Frame` / `FrameHeader` / `FramePanel` + `Collapsible` / `CollapsibleTrigger` / `CollapsiblePanel` |
| `SettingsHeader` | `AppHeader` / `AppHeaderContent` / `AppHeaderDescription` |
| `Switch` (`@calcom/ui`) | `Switch` (`@coss/ui`) |
| `List` / `ListItem` / `ListItemTitle` / `ListItemText` | `ListItem` / `ListItemContent` / `ListItemHeader` / `ListItemTitle` / `ListItemDescription` / `ListItemActions` |
| `List` / `AppListCard` | `Card` + `CardFrame` + `CardPanel` + `ListItem` |
| `EmptyScreen` | `Empty` / `EmptyHeader` / `EmptyMedia` / `EmptyTitle` / `EmptyDescription` |
| `SkeletonContainer` / `SkeletonText` / `SkeletonButton` | `Skeleton` (structured to match the component layout) |
| `VerticalTabs` / `HorizontalTabs` | Ghost `Button` + `ScrollArea` + `useMediaQuery` |
| `TableNew` / `TableRow` / `TableCell` | `ListItem` / `ListItemContent` / `ListItemTitle` / `ListItemDescription` / `ListItemActions` |
| `Avatar` (calcom) | `Avatar` / `AvatarImage` / `AvatarFallback` (coss composition pattern) |
| `Checkbox` (calcom) | `Checkbox` (coss) |
| `cs` (classname util) | `cn` (classname util) |

### CSS Token Changes

When migrating, update Tailwind CSS utility classes to the new design token names:

| Old (`@calcom/ui`) | New (`@coss/ui`) |
|---|---|
| `text-error` | `text-destructive` |
| `text-subtle` | `text-muted-foreground` |
| `border-subtle` | `border` |

### Toast Migration

Replace `showToast` from `@calcom/ui` with `toastManager` from `@coss/ui`:

```tsx
// Before:
import { showToast } from "@calcom/ui/components/toast";
showToast("Success message", "success");
showToast(error.message, "error");

// After:
import { toastManager } from "@coss/ui/components/toast";
toastManager.add({ title: "Success message", type: "success" });
toastManager.add({ title: error.message, type: "error" });
```

You also need a `ToastProvider` wrapper in your app tree:

```tsx
// app/providers.tsx
import { ToastProvider } from "@coss/ui/components/toast";

export function Providers({ children }) {
  return <ToastProvider>{children}</ToastProvider>;
}
```

### Dialog/Sheet Lifecycle Pattern

When migrating dialogs or sheets that depend on external data (e.g. an "edit" modal that receives a selected item), use this pattern to properly separate open state from data state:

```tsx
const [dialogOpen, setDialogOpen] = useState(false);
const [selectedItem, setSelectedItem] = useState<Item | null>(null);

const openDialog = (item: Item) => {
  setSelectedItem(item);
  setDialogOpen(true);
};

// Clean up data only after close animation completes
<Dialog
  open={dialogOpen}
  onOpenChange={setDialogOpen}
  onOpenChangeComplete={(open) => {
    if (!open) setSelectedItem(null);
  }}
>
  ...
</Dialog>
```

This ensures the dialog content remains visible during the close animation and data is cleaned up only after the transition finishes.

### Skeleton Migration

Replace `SkeletonContainer` / `SkeletonText` / `SkeletonButton` with `Skeleton` elements structured to match the actual component layout:

```tsx
// Before:
<SkeletonContainer>
  <SkeletonText className="h-8 w-full" />
  <SkeletonText className="h-8 w-full" />
  <SkeletonButton className="h-8 w-20 rounded-md p-5" />
</SkeletonContainer>

// After: structure skeletons to match the real ListItem layout
<ListItem>
  <ListItemContent>
    <div className="flex items-start gap-4">
      <Skeleton className="size-10 shrink-0 rounded-lg" />
      <div className="flex flex-col gap-1">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-3.5 w-full" />
      </div>
    </div>
  </ListItemContent>
  <ListItemActions>
    <Skeleton className="h-4.5 w-7.5 rounded-full" />
  </ListItemActions>
</ListItem>
```

## Troubleshooting

### Base UI Dialog closes when a Radix Popover is opened

**Symptom**: A Base UI `Dialog` closes when you open a Radix `Popover` inside it and then click anywhere in the dialog. This is most visible in Chrome.

**Root cause**: Radix popovers render in a portal outside the dialog DOM tree. Base UI's dialog uses outside-interaction detection to dismiss itself. In Chrome, focus and pointer events from the popover portal can be interpreted as outside presses, so the dialog closes even though the user is still interacting with the dialog.

**Solution**: Disable pointer dismissal while the Radix popover is open or migrate the popover to Base UI. For the travel schedule modal, we track the Radix popover open state and pass `disablePointerDismissal` to the dialog while the calendar is open.

```tsx
// apps/web/components/settings/TravelScheduleModal.tsx
const [isDateRangeOpen, setIsDateRangeOpen] = useState(false);

<Dialog open={open} disablePointerDismissal={isDateRangeOpen} onOpenChange={onOpenChange}>
  <DateRangePicker onPopoverOpenChange={setIsDateRangeOpen} />
</Dialog>
```

### Infinite loop with lazy-loaded components inside Base UI Dialog

**Symptom**: When opening a coss-ui `Dialog` (Base UI) containing a lazy-loaded component (via `next/dynamic`), an infinite render loop occurs:

```
Error: Maximum update depth exceeded. This can happen when a component repeatedly calls setState inside componentWillUpdate or componentDidUpdate.
```

**Root cause**: Components wrapped in `next/dynamic` have an async mounting lifecycle. When combined with Base UI Dialog's portal mounting, this creates a conflict that triggers infinite re-renders.

For example, `DateRangePicker` from `@calcom/ui/components/form` is lazy-loaded:

```ts
// packages/ui/components/form/date-range-picker/index.ts
export const DateRangePickerLazy = dynamic(() =>
  import("./DateRangePicker").then((mod) => mod.DatePickerWithRange)
);
```

**Solution**: Import the component directly without the lazy loading wrapper. Add a direct export path to the package.json if needed:

```json
// packages/ui/package.json - add direct export
"./components/form/date-range-picker/DateRangePicker": "./components/form/date-range-picker/DateRangePicker.tsx"
```

Then import directly:

```tsx
// Instead of:
import { DateRangePicker } from "@calcom/ui/components/form";

// Use:
import { DatePickerWithRange as DateRangePicker } from "@calcom/ui/components/form/date-range-picker/DateRangePicker";
```

**Note**: Regular Radix components (like `SettingsToggle`, `DatePicker`, etc.) work fine inside Base UI Dialog as long as they're not lazy-loaded.

### Sheet/Dialog slide-in transition missing on first open

**Symptom**: A Base UI `Sheet` or `Dialog` has no slide-in/fade-in transition the first time it opens, but transitions work on subsequent opens.

**Root cause**: This happens when the Sheet/Dialog component is conditionally rendered based on data availability (e.g. `{selectedFlag && <AssignFeatureSheet flag={selectedFlag} />}`). React batches state updates, so the component mounts with `open={true}` on its first render. Base UI's `useTransitionStatus` skips the `'starting'` transition phase when `Dialog.Root` initializes with `open={true}`, meaning no enter animation plays.

**Solution**: Always render the Sheet/Dialog component unconditionally and make any data props nullable. This ensures `Dialog.Root` always initializes with `open={false}` and properly transitions to `open={true}`.

```tsx
// Before (broken transitions):
{selectedFlag && (
  <AssignFeatureSheet flag={selectedFlag} open={sheetOpen} onOpenChange={setSheetOpen} />
)}

// After (transitions work correctly):
<AssignFeatureSheet flag={selectedFlag} open={sheetOpen} onOpenChange={setSheetOpen} />
// Make `flag` prop nullable in AssignFeatureSheet and guard queries with `enabled: !!flag`
```

### Toast renders under Sheet/Dialog overlay

**Symptom**: Toast notifications appear behind the Sheet or Dialog overlay, making them invisible to the user.

**Solution**: Ensure the `ToastProvider` is placed at a level in the component tree where its z-index is above dialog/sheet backdrops, or adjust the toast container's z-index to be higher than the overlay.

### Base UI Form blocks submission in non-validation contexts

**Symptom**: A form's submit button stops working after wrapping it with Base UI's `<Form>` component. The `onSubmit` handler never fires.

**Root cause**: Base UI `<Form>` wraps `onSubmit` with validation logic that checks all registered Base UI `Field` components. If any field is invalid (or if fields from a child dialog "leak" into the form's validation scope), the submission is blocked silently.

**Solution**: Use a native `<form>` element when you don't need Base UI's field-level validation. Reserve Base UI `<Form>` only for components that actually use `Field` / `FieldControl` / `FieldError` for validation.

```tsx
// Before (broken - Form blocks submit because it validates all registered fields):
<Form onSubmit={handleFinish}>
  <WizardStepContent />
  <Button type="submit">Finish</Button>
</Form>

// After (works - native form doesn't interfere with validation):
<form onSubmit={handleFinish}>
  <WizardStepContent />
  <Button type="submit">Finish</Button>
</form>
```

Use Base UI `<Form>` only when you need its validation, such as inside a modal with `Field` / `FieldControl` / `FieldError`:

```tsx
<Dialog>
  <DialogPopup>
    <DialogPanel>
      <Form onSubmit={handleSubmit} id="edit-form">
        <Field name="key" invalid={!!error}>
          <FieldLabel>API Key</FieldLabel>
          <FieldControl render={<Input />} />
          <FieldError>{error?.message}</FieldError>
        </Field>
      </Form>
    </DialogPanel>
    <DialogFooter>
      <Button form="edit-form" type="submit">Save</Button>
    </DialogFooter>
  </DialogPopup>
</Dialog>
```
