# coss Skeleton

## When to use

- Loading placeholders matching final layout density.
- Perceived-performance improvement during fetch/render latency.

## Install

```bash
npx shadcn@latest add @coss/skeleton
```

Manual deps from docs:

```bash
# No extra runtime dependency required for this primitive.
```

## Canonical imports

```tsx
import { Skeleton } from "@/components/ui/skeleton"
```

## Minimal pattern

```tsx
<Skeleton className="size-10 rounded-full" />
```

## Patterns from coss particles

### Key patterns

Card skeleton composition (match the final layout geometry):

```tsx
<div className="flex items-center gap-4">
  <Skeleton className="size-10 rounded-full" />
  <div className="flex flex-1 flex-col">
    <Skeleton className="my-0.5 h-4 max-w-54" />
    <Skeleton className="my-0.5 h-4 w-1/2" />
  </div>
  <Skeleton className="h-7 w-19" />
</div>
```

Shape matching: mirror final text/image/button geometry to reduce content shift.
State handoff: remove skeleton immediately when data is ready to avoid double-render.

### More examples

- skeleton-only layout: `p-skeleton-2`
- full loading-to-loaded flow: `p-skeleton-1`

## Common pitfalls

- Mismatch between skeleton layout and final content layout causing jarring swap.
- Leaving skeleton visible after load completion due missing state transition.
- Using skeleton for very short operations where spinner/text is clearer.

## Useful particle references

See `p-skeleton-1` (full loading flow) and `p-skeleton-2` (skeleton-only layout).
