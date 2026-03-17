---
title: Defer queries in conditionally-visible dialogs
impact: MEDIUM
impactDescription: Eliminates unnecessary API calls on page load
tags: performance, react, trpc
---

## Defer queries in conditionally-visible dialogs

**Impact: MEDIUM (eliminates unnecessary API calls on page load)**

Dialogs and sheets are often rendered unconditionally (always mounted in the tree) but only visible when a state flag is toggled. If a dialog contains `useQuery` calls without proper gating, those queries fire immediately on mount — even if the user never opens the dialog.

Either gate the query with an `enabled` condition tied to the dialog's open state, or conditionally render the dialog component itself. Prefer `enabled` when the component has a simple query. Prefer conditional rendering when the component uses hooks (e.g., `useHasTeamPlan`) that internally fire queries you can't control.

**Incorrect (query fires on mount regardless of dialog visibility):**

```typescript
// Dialog is always mounted
<EditLocationDialog isOpenDialog={isOpen} ... />

// Inside the dialog — query fires immediately
const locationsQuery = trpc.viewer.apps.locationOptions.useQuery(
  { teamId },
  { enabled: hasOrganizer }
);
```

**Correct (query deferred until dialog is opened):**

```typescript
// Option 1: Gate the query with enabled
const locationsQuery = trpc.viewer.apps.locationOptions.useQuery(
  { teamId },
  { enabled: hasOrganizer && isOpenDialog }
);

// Option 2: Conditionally render the dialog (when internal hooks fire uncontrollable queries)
{viewRecordingsDialogIsOpen && (
  <ViewRecordingsDialog ... />
)}
```

Reference: [PR #753](https://github.com/calcom/cal/pull/753)
