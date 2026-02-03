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
- Validate dialog, menu, and popover behavior (portals and focus).
- Run type checks and targeted UI smoke tests.

## Do and Don't

**Do**
- Prefer Base UI mental models: `render` for composability, `*Popup`/`*Panel` for content.
- Use direct component imports instead of barrel imports.
- Keep diffs small and scoped to a single feature or page.
- When converting a shared component, audit other pages/components that consume it and either migrate them in the same PR or explicitly test them.

**Don't**
- Don’t keep lazy-loaded components inside Base UI dialogs without verifying render behavior.
- Don’t rely on Radix-specific props (`asChild`, `type="single"`, `collapsible`) without mapping them.
- Don’t assume API parity; check the component guide first.
- Don’t over-migrate in a single change; prioritize targeted conversions and verification.

## Knowledge Base

### Base UI vs Radix UI mental model

`@coss/ui` is built on Base UI from the ground up. Many component names are similar, but the APIs are not drop-in compatible. Base UI favors `render` props for composition and often exposes `*Popup` or `*Panel` instead of `*Content`.

### Render vs asChild

Radix’s `asChild` becomes Base UI’s `render`. This affects triggers, close buttons, and other slots that used to render children directly.

### Naming conventions

Common renames to expect:

- `DialogContent` → `DialogPopup`
- `AlertDialogContent` → `AlertDialogPopup`
- `AccordionContent` → `AccordionPanel`

Legacy names may remain for compatibility, but new usage should follow Base UI naming.

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
