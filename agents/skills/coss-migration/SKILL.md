---
name: coss-migration
description: Guides the migration of Cal.com pages from @calcom/ui to @coss/ui components. Use when transforming existing settings pages, dialogs, forms, or other UI from the legacy component library to the new COSS (Base UI) component system. Covers component mapping, prop transformations, structural changes, CSS token swaps, test updates, and shared component patterns.
compatibility: Requires the existing coss skill for API-level component usage guidance. Designed for the calcom/cal monorepo.
license: MIT
metadata:
  author: calcom
---

# @calcom/ui to @coss/ui Migration

This skill provides concrete transformation rules for migrating Cal.com pages from `@calcom/ui` to `@coss/ui` (Base UI) components.

## What this skill is for

Use this skill to:

- Look up the exact `@coss/ui` replacement for any `@calcom/ui` component
- Apply correct prop transformations (e.g., `color` to `variant`)
- Restructure DOM/composition to match coss patterns
- Update CSS tokens, utility functions, and test selectors
- Decide when to create shared components vs local implementations

## Relationship to the `coss` skill

This skill is complementary to the existing `coss` skill:

- **`coss` skill** -- How to *use* coss components correctly (imports, composition, props, API reference)
- **`coss-migration` skill** (this) -- How to *transform* `@calcom/ui` code into `@coss/ui` code

Always consult the `coss` skill for detailed API usage after identifying the target component here.

## Guiding principles

1. **Component swap, not UX redesign.** The goal is to replace the UI layer. Preserve all existing data fetching, tRPC mutations, form validation logic, and business rules unchanged. Only fix obvious UX bugs encountered during migration.
2. **Prefer coss-ui Form integrated with React Hook Form.** If a specific UI logic suggests a different approach (e.g., complex multi-step state), stop and ask for confirmation before deviating.
3. **No Toggle-opens-Dialog.** If a setting requires a Dialog, use a Button or descriptive trigger instead of a toggle/switch.
4. **Drawer over Sheet.** Prefer the `Drawer` component over `Sheet` for side/bottom panels.
5. **Field over standalone Label.** Always use `Field` composition (`FieldLabel`, `FieldDescription`, `FieldError`) over standalone `Label` components.
6. **Icons from `@coss/ui/icons` only.** Flag and replace any legacy icon imports (`lucide-react`, `@calcom/ui`, etc.).
7. **`cn()` only.** Replace all `classNames()` and `cs()` calls with `cn()` from `@coss/ui`.
8. **Loading prop on buttons.** Use the native `loading` prop on Button during form submission. Never manually nest `<Spinner />` inside a button.
9. **Cancel = ghost.** Cancel/close buttons in dialog footers always use `variant="ghost"`.

## Layout and spacing rules

- Replace `mt-*`, `space-y-*`, `space-x-*` with `flex flex-col gap-*` (or `flex gap-*` for horizontal) on the parent wrapper.
- Do not add layout utility classes directly to high-level coss components. Instead, create an inner `<div>` to handle spacing. For example, use `<CardPanel><div className="flex flex-col gap-4">...</div></CardPanel>` instead of `<CardPanel className="flex flex-col gap-4">`.

## Dialog rules

- Use `onOpenChangeComplete` (not `onOpenChange`) when resetting or changing content within a Dialog. This prevents visual drifts during transitions.
- **Sibling Dialog Rule:** Can the user go back to the first dialog from the second?
  - **Yes** -- Use a nested dialog.
  - **No** -- Change the content within the existing dialog (single `Dialog.Root` with step state).
  - **Otherwise** -- Use adjacent dialogs (less ideal due to backdrop crossfading).

## Migration workflow

1. Identify all `@calcom/ui` imports in the target file(s).
2. Consult `./references/component-mapping.md` for the replacement.
3. For each component group, read the corresponding rule file under `./references/rules/`.
4. Apply transformations, preserving all business logic.
5. Run through the post-migration checklist at `./references/checklists/post-migration.md`.
6. Update tests per `./references/rules/test-migration.md`.

## Reference index

- `./references/component-mapping.md` -- Master lookup table: every `@calcom/ui` component and its `@coss/ui` replacement
- `./references/rules/page-layout.md` -- SettingsHeader, SectionBottomActions, page structure
- `./references/rules/cards-containers.md` -- PanelCard, Card, CardFrame, SettingsToggle
- `./references/rules/dialogs-overlays.md` -- Dialog, AlertDialog, Sheet, Drawer
- `./references/rules/forms-inputs.md` -- TextField, SelectField, Form, Switch, PasswordField
- `./references/rules/lists-data.md` -- Tables, ListItem, EmptyScreen, Menu
- `./references/rules/feedback-notifications.md` -- Toast, Alert, Badge, Tooltip
- `./references/rules/skeletons-loading.md` -- Skeleton patterns, loading states
- `./references/rules/buttons.md` -- Button prop mapping, icon placement, loading
- `./references/rules/css-tokens.md` -- Class name and CSS variable migrations
- `./references/rules/test-migration.md` -- Unit test mocks, E2E selectors
- `./references/rules/shared-components.md` -- When and how to create shared components
- `./references/checklists/pre-migration.md` -- Before you start
- `./references/checklists/post-migration.md` -- Verification after migration
- `./references/checklists/pr-review.md` -- Review checklist for migration PRs
