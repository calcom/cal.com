# Skeletons & Loading States Migration

## SkeletonContainer / SkeletonText / SkeletonButton to Skeleton

The old library has multiple specialized skeleton components. The coss library uses a single `Skeleton` component styled via className.

### Before

```tsx
import { SkeletonContainer, SkeletonText, SkeletonButton } from "@calcom/ui";

<SkeletonContainer>
  <SkeletonText className="h-4 w-48" />
  <SkeletonText className="h-4 w-32" />
  <SkeletonButton className="h-10 w-24" />
</SkeletonContainer>
```

### After

```tsx
import { Skeleton } from "@coss/ui/components/skeleton";

<div className="flex flex-col gap-4">
  <Skeleton className="h-4 w-48" />
  <Skeleton className="h-4 w-32" />
  <Skeleton className="h-10 w-24 rounded-md" />
</div>
```

Key differences:
- **No container component.** Use a plain `<div>` with flex/gap for layout.
- **Single `Skeleton` for all shapes.** Size and shape controlled entirely by className (`h-*`, `w-*`, `rounded-*`).
- **`SkeletonButton`** becomes `<Skeleton className="h-10 w-24 rounded-md" />`.
- **`SkeletonText`** becomes `<Skeleton className="h-4 w-*" />`.

For Skeleton composition API, consult the `coss` skill at `primitives/skeleton.md`.
