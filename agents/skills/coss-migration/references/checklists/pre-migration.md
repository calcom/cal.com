# Pre-Migration Checklist

Run through this checklist before starting a migration.

## 1. Identify scope

- [ ] List all `@calcom/ui` imports in the target file(s)
- [ ] Check if the file imports from `@calcom/lib` utilities that need replacement (e.g., `classNames`)
- [ ] Check for `lucide-react` or other direct icon imports
- [ ] Note any `showToast` usage

## 2. Consult component mapping

- [ ] Look up each `@calcom/ui` import in `../component-mapping.md`
- [ ] For any component not in the mapping table, check if the coss skill covers it
- [ ] If a component has no known coss equivalent, flag it and ask before proceeding

## 3. Review the target page structure

- [ ] Identify the page layout pattern (SettingsHeader, tabs, cards, etc.)
- [ ] Note any shared components already created for similar pages
- [ ] Check if sibling pages have already been migrated (look for `@coss/ui` imports in the same directory) and follow the same patterns

## 4. Check for existing tests

- [ ] Identify unit test files (`.test.tsx` / `.spec.tsx`) for the target file(s)
- [ ] Identify E2E test files that exercise the page
- [ ] Note which test selectors depend on component structure (data-testid, role, data-state)

## 5. Understand business logic

- [ ] Identify all tRPC queries and mutations used by the page
- [ ] Note form validation schemas (zod, etc.)
- [ ] Identify any custom hooks or state management
- [ ] These must remain unchanged during migration

## 6. Branch and commit strategy

- [ ] Create a feature branch from latest main
- [ ] Plan to keep the PR focused: one page or one closely related group of pages per PR
- [ ] Aim for <500 lines changed. If the migration exceeds this, discuss splitting with the reviewer
