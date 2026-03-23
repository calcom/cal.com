# coss Pagination

## When to use

- Paged navigation over long result sets.
- Prev/next and index controls paired with data tables/lists.

## Install

```bash
npx shadcn@latest add @coss/pagination
```

Manual deps from docs:

```bash
# No extra runtime dependency required for this primitive.
```

## Canonical imports

```tsx
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"
```

## Minimal pattern

```tsx
<Pagination>
  <PaginationContent>
    <PaginationItem>
      <PaginationPrevious href="#" />
    </PaginationItem>
    <PaginationItem>
      <PaginationLink href="#">1</PaginationLink>
    </PaginationItem>
    <PaginationItem>
      <PaginationEllipsis />
    </PaginationItem>
    <PaginationItem>
      <PaginationNext href="#" />
    </PaginationItem>
  </PaginationContent>
</Pagination>
```

## Patterns from coss particles

### Key patterns

Full pagination with active page:

```tsx
<Pagination>
  <PaginationContent>
    <PaginationItem>
      <PaginationPrevious href="#" />
    </PaginationItem>
    <PaginationItem>
      <PaginationLink href="#">1</PaginationLink>
    </PaginationItem>
    <PaginationItem>
      <PaginationLink href="#" isActive>2</PaginationLink>
    </PaginationItem>
    <PaginationItem>
      <PaginationLink href="#">3</PaginationLink>
    </PaginationItem>
    <PaginationItem>
      <PaginationEllipsis />
    </PaginationItem>
    <PaginationItem>
      <PaginationNext href="#" />
    </PaginationItem>
  </PaginationContent>
</Pagination>
```

### More examples

See `p-pagination-1` through `p-pagination-3` for various pagination layouts.

## Common pitfalls

- Using pagination controls without synchronizing data/page state.
- Mixing pagination with infinite-scroll UX in the same surface.
- Missing disabled-state handling on prev/next boundaries.

## Useful particle references

- core patterns: `p-pagination-1`, `p-pagination-2`, `p-pagination-3`
