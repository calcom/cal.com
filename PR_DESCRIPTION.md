fix(ui): migrate off Next.js <Link legacyBehavior> — fix hydration & ref-forwarding issues

Fixes
Fixes #24417

Summary
- Removed deprecated Next.js `Link` `legacyBehavior` usage across the codebase and migrated affected components to the new `Link` API to resolve ref-forwarding, DOM nesting, and hydration/runtime errors observed while running the application locally.
- Fixed runtime errors (e.g. `null parentNode`), improved SSR determinism, and preserved accessibility/interactive behavior for core UI components (Dropdown, Button, List, Stepper, etc.).

Impact / Scope
- UI-only, non-breaking changes. No API or DB changes. Small typing and lint fixes included.

Motivation
Using `legacyBehavior` produced inconsistent server/client markup, broken refs, and nested interactive elements (anchor inside button), leading to hydration warnings and runtime exceptions. Migrating to the new `Link` API prevents these problems and prepares the codebase for React 19 / Next.js 15.

Files changed (high level)
- `packages/ui/components/dropdown/Dropdown.tsx`
- `packages/ui/components/button/Button.tsx`
- `packages/ui/components/list/List.tsx`
- `packages/ui/components/form/step/Stepper.tsx`
- `packages/lib/turndownService.ts`
- `packages/features/shell/CalAiBanner.tsx`
- `packages/app-store/_components/AppNotInstalledMessage.tsx`
- `apps/web/modules/bookings/views/bookings-single-view.tsx`
- `apps/web/components/apps/make/Setup.tsx`
- `apps/web/components/apps/zapier/Setup.tsx`
- `apps/web/modules/auth/forgot-password/[id]/forgot-password-single-view.tsx`
- plus small lint/type fixes across related files

Key changes
- Removed all uses of Link `legacyBehavior` and updated Link usage to the new API (pass `className`/props directly to `Link`).
- Fixed ref forwarding and removed unsafe `any` casts in Dropdown and Button components.
- Separated List into SSR-safe rendering and a `ListLinkItem` to avoid nested interactive elements.
- Hardened `turndownService` to avoid traversing null parent nodes.
- Deferred `CalAiBanner` visibility to client mount to prevent hydration mismatches.
- Cleaned up ESLint warnings and added targeted rule disables where necessary.

Manual QA steps (recommended)
1) Prepare
   - `yarn install && yarn dedupe`
2) Local checks
   - `yarn dev`  # or build with `yarn build`
   - `yarn lint`
   - `yarn test`
3) Smoke tests (verify in both dev and production builds)
   - Dropdown menus: open/close, keyboard navigation, focus behavior
   - Button components rendering as Links: ensure no nested anchors/buttons and keyboard/Enter works
   - List + ListLinkItem: SSR output matches client render and navigation works
   - Stepper: next/back flow
   - Bookings single view, Forgot-password view, AppNotInstalledMessage, Make & Zapier setup pages: links/navigation work
   - CalAiBanner: no hydration mismatch on initial page load
4) Edge cases
   - Keyboard-only navigation and screen-reader checks for major components
   - Confirm prior runtime errors (`null parentNode`, ref issues) no longer appear in logs/console

What reviewers should verify
- PR title follows Conventional Commits (starts with `fix:`) — required for CI
- No remaining usage of `legacyBehavior`
- Correct ref forwarding and typing (no unsafe `any` casts)
- No nested interactive elements introduced by the changes
- No hydration mismatch warnings in browser console
- CI (typecheck / lint / tests) passes
- Behavioral parity with previous UI (keyboard/focus/ARIA preserved)

Commands (copy to terminal)
# Update PR title (run once)
gh pr edit 24417 --title "fix(ui): migrate off Next.js <Link legacyBehavior> — fix hydration & ref-forwarding issues"

# Update PR body from this file (run once)
gh pr edit 24417 --body-file PR_DESCRIPTION.md

# Optional: add reviewers/labels
gh pr edit 24417 --add-reviewer maintainer1 --add-reviewer maintainer2 --add-label "area:ui" --add-label "type:bug"

# Local checks
yarn install && yarn dedupe
yarn build
yarn lint
yarn test

Visual demo (strongly recommended)
- Attach a console screenshot showing the hydration warning (before) and a short GIF (5–10s) showing dropdown/button behavior before vs after. Upload via the PR web UI.

Checklist (DO NOT REMOVE)
- [ ] I have self-reviewed the code
- [ ] I have added tests where applicable, or noted why not applicable
- [ ] I have run lint and fixed warnings where possible
- [ ] I have added a visual demo (recommended) or documented how to reproduce

Notes
- No API/DB changes; non-breaking UI fixes. This PR fixes issues reported in #24417 and was created after encountering the issues while running the application locally.
