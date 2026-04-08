# PR Review Checklist for Migration PRs

Use this checklist when reviewing a PR that migrates a page from `@calcom/ui` to `@coss/ui`.

## Completeness

- [ ] All `@calcom/ui` imports removed from migrated files
- [ ] All `lucide-react` / direct icon imports replaced with `@coss/ui/icons`
- [ ] All `classNames()` / `cs()` replaced with `cn()`
- [ ] All `showToast` replaced with `toastManager.add`
- [ ] Corresponding test files updated

## Correctness

- [ ] Component mapping matches the rules in `component-mapping.md`
- [ ] Cancel buttons use `variant="ghost"`
- [ ] Submit buttons use `loading` prop
- [ ] Icons in buttons have `aria-hidden="true"`
- [ ] Form fields use `Field` composition
- [ ] Dialogs use `onOpenChangeComplete` for state resets
- [ ] No layout classes on high-level coss components (inner `<div>` wrappers used)
- [ ] Spacing uses `flex gap-*` patterns (no `mt-*` / `space-y-*`)

## Scope

- [ ] No business logic changes (tRPC, validation, hooks unchanged)
- [ ] No significant UX changes (component swap only, obvious fixes acceptable)
- [ ] No unrelated refactors mixed in
- [ ] PR is focused: one page or one closely related group per PR
- [ ] PR size is reasonable (<500 lines ideally)

## CSS tokens

- [ ] No legacy tokens remain (`text-emphasis`, `border-subtle`, `bg-default`, etc.)
- [ ] Check `data-state` is not used (should be `data-open`, `data-checked`, `data-pressed`)

## Shared components

- [ ] If a new shared component was created, verify it follows the pattern in `shared-components.md`
- [ ] If an existing shared component fits, verify it was used instead of a local implementation
- [ ] Shared components imported from `@coss/ui/shared/*` (not inlined)

## Dialog patterns

- [ ] Sibling dialog rule followed (nested vs content-switching vs adjacent)
- [ ] No toggle-opens-dialog antipattern
- [ ] `Drawer` preferred over `Sheet`

## Tests

- [ ] Unit test mocks target individual `@coss/ui/components/*` paths
- [ ] Toast assertions use `{ title, type }` object shape
- [ ] E2E selectors updated if DOM structure changed
- [ ] All tests pass
