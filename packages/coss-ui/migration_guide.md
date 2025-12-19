# coss-ui Migration Guide

Guide for migrating from `@calcom/ui` (Radix/shadcn) to `@coss/ui` (Base UI).

## Troubleshooting

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
