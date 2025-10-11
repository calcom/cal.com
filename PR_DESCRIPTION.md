PR title
Migrate off Next.js <Link legacyBehavior>, fix hydration & ref-forwarding issues

Summary
- Removed deprecated Next.js <Link legacyBehavior> usage across the codebase and migrated affected components to the new Link API to address ref-forwarding, DOM nesting and hydration/runtime errors encountered while running the application locally.
- Fixed runtime errors (e.g. null parentNode), improved SSR determinism, and preserved accessibility and interactive behavior for core UI components (Dropdown, Button, List, Stepper, etc.).

Motivation
legacyBehavior produced incorrect DOM nesting and broken refs on newer React/Next versions leading to hydration mismatch warnings and runtime exceptions. This migration removes those causes and prepares the repo for future Next.js / React upgrades.

Files changed (high level)
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
- plus small lint/type fixes across related files

Key changes
- Removed all uses of Link legacyBehavior and updated Link usage to the new API (pass className/props directly to Link).
- Fixed ref forwarding and removed unsafe any casts in Dropdown and Button components.
- Separated List into SSR-safe rendering and a ListLinkItem to avoid nested interactive elements.
- Hardened turndownService to avoid traversing null parent nodes.
- Deferred CalAiBanner visibility to client mount to prevent hydration mismatches.
- Cleaned up ESLint warnings and added targeted rule disables where necessary.

Manual QA steps (recommended)
1) Prepare
   - yarn install && yarn dedupe
2) Local checks
   - yarn dev  # or build with yarn build
   - yarn lint
   - yarn test
3) Smoke tests (run in both dev and production build)
   - Dropdown menus: open/close, keyboard navigation, focus behavior
   - Button components rendering as Links: ensure no nested anchors/buttons and keyboard/Enter works
   - List + ListLinkItem: SSR output matches client render and navigation works
   - Stepper: next/back flow
   - Bookings view, Forgot-password view, AppNotInstalledMessage, Make & Zapier setup pages: links/navigation work
   - CalAiBanner: no hydration mismatch on initial page load
4) Edge cases
   - Keyboard-only navigation and screen-reader checks for major components
   - Confirm prior runtime errors (null parentNode, ref issues) no longer appear in logs/console

What reviewers should verify
- No remaining usage of legacyBehavior anywhere
- Correct ref forwarding and typing (no unsafe any casts)
- No nested interactive elements introduced by the changes
- No hydration mismatch warnings in browser console
- CI (typecheck / lint / tests) passes
- Behavioral parity with previous UI (keyboard/focus/ARIA preserved)

Commands (copy/paste)
# Install dependencies and dedupe
yarn install && yarn dedupe

# Local dev (optional)
yarn dev

# Build / checks
yarn build
yarn lint
yarn test

# Git (if you haven't already committed your changes locally)
# If you've already committed, skip branch/commit steps and just push to the branch used below
git checkout -b fix/next-link-hydration
git add -A
git commit -m "chore(ui): migrate Link usage off legacyBehavior and fix hydration/ref-forwarding issues"

git push -u origin fix/next-link-hydration

# Create PR with GitHub CLI (recommended)
# If you are contributing from a fork, ensure your fork branch is pushed and use --head <your-user>:fix/next-link-hydration
# Add --draft if you want reviewers to see before finalizing
gh pr create \
  --title "Migrate off Next.js <Link legacyBehavior>, fix hydration & ref-forwarding issues" \
  --body-file PR_DESCRIPTION.md \
  --base main \
  --head fix/next-link-hydration

# Optional: add reviewers/labels after creation
# gh pr edit <PR_NUMBER> --add-reviewer <user1> --add-label "area:ui","type:chore"

Notes to increase chances of acceptance
- Keep the PR focused and well-documented (this description + per-file short notes in PR thread helps reviewers).
- Provide a small, clear manual testing checklist (included above) so reviewers can quickly validate behavior.
- Include screenshots or a short GIF demonstrating before/after hydration warnings or runtime errors being resolved. Attach them in the PR description or comments.
- Ensure CI passes before requesting reviews (typecheck/lint/tests). If CI fails, iterate and push fixes to the same branch.
- If the change is cross-cutting, ask maintainers for preferred reviewers (mention maintainers in PR comments politely).
- If the repo prefers issues be filed first, offer to create an issue and link it in the PR (I can create one on request).

Checklist (please tick before merging)
- [ ] I have self-reviewed the code
- [ ] I have run lint and fixed warnings where possible
- [ ] I have run tests locally
- [ ] I have included manual QA steps in the PR
- [ ] I have added visual demo (recommended) or documented how to reproduce

Additional help
If you want, I can:
- Create a GitHub issue summarizing the migration and link the PR to it.
- Generate small unit tests for turndownService or accessibility checks and add them to this branch.
- Draft the short per-file notes for the PR description to help reviewers review diffs faster.

---

(Placeholders: There was no pre-existing issue number; this PR was generated after encountering the issues while running the application locally.)
