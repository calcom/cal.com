# Fix: Unnecessary Re-renders in Alert Component Examples

## Issue
Fixes #24508

## Problem
The Alert component examples in the UI playground were creating action elements inline within map loops. This caused unnecessary re-renders because React would create new JSX elements on every render cycle, even when the actions were identical across all Alert instances.

### Before (Anti-pattern)
```tsx
{severities.map((severity) => (
  <Alert
    severity={severity}
    actions={
      <div className="flex space-x-2">  // ❌ Created inside map - new object on every render
        <button>Dismiss</button>
        <button>View</button>
      </div>
    }
  />
))}
```

### After (Optimized)
```tsx
const alertActions = (
  <div className="flex space-x-2">  // ✅ Created once - same reference used
    <button>Dismiss</button>
    <button>View</button>
  </div>
);

{severities.map((severity) => (
  <Alert
    severity={severity}
    actions={alertActions}
  />
))}
```

## Changes
- Moved `alertActions` definition outside the component function in `apps/ui-playground/content/design/components/alert.actions.tsx`
- This prevents React from treating the actions as new props on every render, improving performance

## Performance Impact
- **Reduced Re-renders**: Alert components no longer unnecessarily re-render when actions haven't changed
- **Memory Efficiency**: Single JSX element is reused instead of creating new objects in each iteration
- **Better Reconciliation**: React's diffing algorithm can skip the actions subtree more efficiently

## Testing
Existing tests in `packages/ui/components/alert/alert.test.tsx` continue to pass, including:
- ✅ Action rendering
- ✅ Icon rendering for all severity levels
- ✅ Title and message display

## Changeset
Added changeset documenting this performance improvement as a patch to `@calcom/ui`

## Related
This is a common React performance pattern. For more context:
- [React Docs: Preserving and Resetting State](https://react.dev/learn/preserving-and-resetting-state)
- [React Docs: Avoiding Recreating the Initial State](https://react.dev/reference/react/useState#avoiding-recreating-the-initial-state)
