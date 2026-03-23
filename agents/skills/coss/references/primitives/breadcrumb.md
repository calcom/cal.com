# coss Breadcrumb

## When to use

- Hierarchy/location indicators for current page context.
- Compact navigation trails for nested routes and detail pages.

## Install

```bash
npx shadcn@latest add @coss/breadcrumb
```

Manual deps from docs:

```bash
# No extra runtime dependency required for this primitive.
```

## Canonical imports

```tsx
import {
  Breadcrumb,
  BreadcrumbEllipsis,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
```

## Minimal pattern

```tsx
<Breadcrumb>
  <BreadcrumbList>
    <BreadcrumbItem>
      <BreadcrumbLink href="/">Home</BreadcrumbLink>
    </BreadcrumbItem>
    <BreadcrumbSeparator />
    <BreadcrumbItem>
      <BreadcrumbEllipsis />
    </BreadcrumbItem>
    <BreadcrumbItem>
      <BreadcrumbLink href="/components">Components</BreadcrumbLink>
    </BreadcrumbItem>
    <BreadcrumbSeparator />
    <BreadcrumbItem>
      <BreadcrumbPage>Breadcrumb</BreadcrumbPage>
    </BreadcrumbItem>
  </BreadcrumbList>
</Breadcrumb>
```

## Patterns from coss particles

### Key patterns

Icon-only home link (requires `aria-label`):

```tsx
<BreadcrumbItem>
  <BreadcrumbLink aria-label="Home" href="/">
    <HomeIcon aria-hidden="true" className="size-4" />
  </BreadcrumbLink>
</BreadcrumbItem>
```

Custom separator:

```tsx
<BreadcrumbSeparator>
  <SlashIcon className="size-3.5" />
</BreadcrumbSeparator>
```

### More examples

See `p-breadcrumb-1` and `p-breadcrumb-2` for default and custom separator patterns.

## Common pitfalls

- Using breadcrumb as primary nav menu instead of contextual trail.
- Omitting `aria-label` on icon-only breadcrumb items.
- Adding deep breadcrumb chains without meaningful hierarchy.

## Useful particle references

- with custom separator: `p-breadcrumb-2`
