# Bug report: Migrate off Next.js <Link legacyBehavior> — hydration, ref-forwarding, and runtime fixes

### Issue Summary
One-sentence explanation: Next.js `Link` components using `legacyBehavior` caused DOM nesting, ref-forwarding and hydration/runtime errors (e.g. `null parentNode`); this PR migrates `Link` usage to the new API and fixes the related issues.

---

### Steps to Reproduce
1. Prepare the repository and dependencies:
   - `yarn install && yarn dedupe`
2. Start the app in dev or production build:
   - `yarn dev`  (or `yarn build && yarn start`)
3. Open pages that use Link / interactive components such as:
   - Bookings single view, Forgot-password single view, AppNotInstalledMessage, Make & Zapier setup pages, pages with Dropdowns/Buttons-as-Links/List/Stepper
4. Interact and observe:
   - Watch the browser console for hydration warnings and runtime errors when opening dropdowns or navigating via keyboard.
5. Reproduce specific runtime error path:
   - Trigger flows that convert HTML → markdown (turndownService) or render server/client inconsistent Link markup to reproduce `Cannot read properties of null (reading 'parentNode')` or hydration mismatch.

Any other relevant information: this is a bug because `legacyBehavior` produced inconsistent server vs client HTML structure and unsafe ref usage, causing developer-facing console warnings and potential user-facing UI breakage. Expected behavior is deterministic SSR → client render with correct element types, correct ref forwarding, and preserved accessibility (keyboard focus, ARIA).

---

### Actual Results
- Hydration mismatch warnings appear in the browser console on initial page load.
- Runtime errors such as `Cannot read properties of null (reading 'parentNode')` from `turndownService` in certain flows.
- Broken ref forwarding and nested interactive elements (anchor inside button or vice-versa) leading to unexpected keyboard behavior and accessibility regressions.
- ESLint warnings related to unsafe `any` casts and unused imports in affected files.

---

### Expected Results
- No hydration mismatch warnings on page load.
- No runtime exceptions from `turndownService` or component render paths.
- Correct ref forwarding (use of `forwardRef` where needed) and no nested interactive elements.
- Keyboard interaction and focus behavior remain correct and accessible.
- Clean lint/type output for the modified files.

---

### Technical details
- Environment used for testing: macOS (local dev), Node.js 18+ recommended, Yarn
- Commands used:
  - `yarn install && yarn dedupe`
  - `yarn dev`
  - `yarn build && yarn start`
  - `yarn lint`
  - `yarn test`
- Branch with fixes: `fix/next-link-hydration`
- Key files changed:
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

---

### Evidence
- Manual tests performed:
  - Dev and production builds: confirmed hydration warnings present before the change and resolved after migration to the new `Link` API.
  - Interacted with Dropdowns, List items, Buttons-as-Links, and Stepper to validate keyboard navigation and no nested anchors/buttons.
  - Reproduced and fixed the `null parentNode` error path in `turndownService`.
- Attachments to include with the issue/PR:
  - Console screenshot showing hydration warning(s) (before)
  - Short GIF showing dropdown/button behavior before vs after (recommended)
  - Relevant console stack trace(s) for the runtime exception(s)
- Testing notes: run the smoke test checklist in `PR_DESCRIPTION.md` and verify CI (typecheck/lint/tests) passes.

---

(You can copy-paste the content above into GitHub's "New Issue" form and attach the screenshots/GIFs for stronger evidence.)
