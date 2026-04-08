# Post-Migration Checklist

Run through this checklist after completing a migration.

## 1. Import verification

- [ ] No remaining `@calcom/ui` imports in migrated files
- [ ] No remaining `lucide-react` imports (use `@coss/ui/icons`)
- [ ] No remaining `classNames()` or `cs()` calls (use `cn()`)
- [ ] No remaining `showToast` calls (use `toastManager.add`)

## 2. Component standards

- [ ] All cancel/close buttons use `variant="ghost"`
- [ ] All submit buttons use `loading` prop (not manual `<Spinner />`)
- [ ] All icons inside buttons have `aria-hidden="true"`
- [ ] All form fields use `Field` composition (not standalone `Label`)
- [ ] All toggles/switches are for simple boolean settings only (no toggle-opens-dialog)
- [ ] `Drawer` used instead of `Sheet` for side/bottom panels

## 3. Layout and spacing

- [ ] No `mt-*`, `space-y-*`, or `space-x-*` on parent wrappers (use `flex flex-col gap-*` or `flex gap-*`)
- [ ] No layout utility classes directly on high-level coss components (`CardPanel`, `DialogPanel`, etc.) -- use inner `<div>` wrappers
- [ ] Dialogs use `onOpenChangeComplete` for state resets (not `onOpenChange`)

## 4. CSS tokens

- [ ] No legacy color tokens (`text-emphasis`, `text-subtle`, `border-subtle`, `bg-default`, etc.)
- [ ] No `data-state` attributes (use boolean `data-open`, `data-checked`, `data-pressed`)
- [ ] Verify hover/focus states use new tokens

## 5. Business logic preserved

- [ ] All tRPC mutations still fire with the same arguments
- [ ] Form validation unchanged
- [ ] Conditional rendering logic unchanged
- [ ] No significant UX changes (this phase is component swap only)

## 6. Tests updated

- [ ] Unit test mock paths updated to `@coss/ui/components/*` and `@coss/ui/shared/*`
- [ ] Toast assertions updated to `toastManager.add({ title, type })` shape
- [ ] Data attribute selectors updated (e.g., `data-checked` instead of `data-state="checked"`)
- [ ] Tests pass locally

## 7. Type check

- [ ] Run `yarn type-check:ci --force` and verify no new errors in migrated files
