# coss Empty

## When to use

- No-data/no-results states with guidance.
- Action-oriented recovery UIs when content lists are empty.

## Install

```bash
npx shadcn@latest add @coss/empty
```

Manual deps from docs:

```bash
# No extra runtime dependency required for this primitive.
```

## Canonical imports

```tsx
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
```

## Minimal pattern

```tsx
<Empty>
  <EmptyHeader>
    <EmptyMedia variant="icon">
      <Icon />
    </EmptyMedia>
    <EmptyTitle>No data</EmptyTitle>
    <EmptyDescription>No data found</EmptyDescription>
  </EmptyHeader>
  <EmptyContent>
    <Button>Add data</Button>
  </EmptyContent>
</Empty>
```

## Patterns from coss particles

### Key patterns

Empty state with icon and action:

```tsx
<Empty>
  <EmptyHeader>
    <EmptyMedia variant="icon">
      <FolderIcon aria-hidden="true" />
    </EmptyMedia>
    <EmptyTitle>No projects yet</EmptyTitle>
    <EmptyDescription>Get started by creating your first project.</EmptyDescription>
  </EmptyHeader>
  <EmptyContent>
    <Button>
      <PlusIcon aria-hidden="true" />
      New Project
    </Button>
  </EmptyContent>
</Empty>
```

Always include an actionable next step (button, link) in `EmptyContent`.

### More examples

See `p-empty-1` for the core pattern.

## Common pitfalls

- Presenting empty states without actionable next step.
- Using empty state component for loading/error states instead of dedicated primitives.
- Copy-only empty states with no context-specific guidance for recovery.

## Useful particle references

- core patterns: `p-empty-1`
