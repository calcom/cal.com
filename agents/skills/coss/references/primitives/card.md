# coss Card

## When to use

- Structured surface sections for grouped content.
- Settings, dashboard, and preview layouts with header/panel/footer semantics.

## Install

```bash
npx shadcn@latest add @coss/card
```

Manual deps from docs:

```bash
# No extra runtime dependency required for this primitive.
```

## Canonical imports

```tsx
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardPanel,
  CardTitle,
} from "@/components/ui/card"
```

## Minimal pattern

```tsx
<Card>
  <CardHeader>
    <CardTitle>Title</CardTitle>
    <CardDescription>Description</CardDescription>
  </CardHeader>
  <CardPanel>Content</CardPanel>
  <CardFooter>Footer</CardFooter>
</Card>
```

## Patterns from coss particles

### Key patterns

Card with form content:

```tsx
<Card className="w-full max-w-sm">
  <CardHeader>
    <CardTitle>Create project</CardTitle>
    <CardDescription>Deploy your new project in one click.</CardDescription>
  </CardHeader>
  <CardPanel className="flex flex-col gap-4">
    <Field>
      <FieldLabel>Name</FieldLabel>
      <Input type="text" placeholder="My project" />
    </Field>
  </CardPanel>
  <CardFooter className="flex justify-end gap-2">
    <Button variant="ghost">Cancel</Button>
    <Button>Create</Button>
  </CardFooter>
</Card>
```

Keep `CardHeader`, `CardPanel`, and `CardFooter` as direct children of `Card` to preserve built-in spacing and layout.

### More examples

See `p-card-1` through `p-card-8` for various card compositions.

## Common pitfalls

- Skipping `CardHeader`/`CardPanel`/`CardFooter` structure in composed cards.
- Mixing unrelated layout wrappers that break spacing between card sections.
- Using cards as generic wrappers when `Frame` or plain layout would be clearer.

## Useful particle references

- core patterns: `p-card-1`, `p-card-2`, `p-card-3`, `p-card-4`, `p-card-5`, `p-card-6`, `p-card-7`, `p-card-8`
