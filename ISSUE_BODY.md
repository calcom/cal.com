Summary
I encountered several runtime and hydration issues when running the app locally that traced back to usage of Next.js <Link legacyBehavior>. This repo-wide migration removes legacyBehavior usage and fixes ref-forwarding, DOM nesting (nested anchors/buttons), hydration mismatch warnings, and a runtime null parentNode error in turndownService.

Why this matters
- legacyBehavior produces incorrect DOM nesting and broken refs on modern React/Next versions, causing hydration warnings and runtime errors.
- Migrating ensures compatibility with React 19 / Next.js 15 and prevents user-facing regressions.

What the PR changes
- Removes all uses of Link legacyBehavior and updates Link usage to the new API.
- Fixes ref forwarding and removes unsafe any casts in Dropdown and Button.
- Splits List to make SSR deterministic and introduced ListLinkItem to avoid nested interactive elements.
- Hardened turndownService to avoid traversing null parent nodes.
- Deferred CalAiBanner visibility to client mount to prevent hydration mismatch.
- Cleaned up ESLint warnings and minor typing fixes.

How to reproduce (developer-local)
1) yarn install && yarn dedupe
2) yarn dev (or build with yarn build)
3) Observe console/hydration warnings and runtime errors during flows using components listed above (Dropdowns, Buttons-as-Links, List items, Stepper).
4) Apply the changes on branch fix/next-link-hydration and verify warnings/errors are gone.

Files changed (high-level)
- packages/ui/components/dropdown/Dropdown.tsx
- packages/ui/components/button/Button.tsx
- packages/ui/components/list/List.tsx
- packages/ui/components/form/step/Stepper.tsx
- packages/lib/turndownService.ts
- packages/features/shell/CalAiBanner.tsx
- packages/app-store/_components/AppNotInstalledMessage.tsx
- apps/web/modules/bookings/views/bookings-single-view.tsx
- apps/web/components/apps/make/Setup.tsx
- apps/web/components/apps/zapier/Setup.tsx
- apps/web/modules/auth/forgot-password/[id]/forgot-password-single-view.tsx

Notes
- No DB/API changes. This was discovered while running the app locally; no prior issue existed. Please review for regressions in keyboard/focus/ARIA behavior.
