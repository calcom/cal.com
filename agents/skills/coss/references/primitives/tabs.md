# coss Tabs

## When to use

- Mutually exclusive content panels in one region.
- Settings/detail screens split into scoped views.

## Install

```bash
npx shadcn@latest add @coss/tabs
```

Manual deps from docs:

```bash
# No extra runtime dependency required for this primitive.
```

## Canonical imports

```tsx
import { Tabs, TabsList, TabsPanel, TabsTab } from "@/components/ui/tabs"
```

## Minimal pattern

```tsx
<Tabs defaultValue="tab-1">
  <TabsList>
    <TabsTab value="tab-1">Tab 1</TabsTab>
    <TabsTab value="tab-2">Tab 2</TabsTab>
    <TabsTab value="tab-3">Tab 3</TabsTab>
  </TabsList>
  <TabsPanel value="tab-1">Tab 1 content</TabsPanel>
  <TabsPanel value="tab-2">Tab 2 content</TabsPanel>
  <TabsPanel value="tab-3">Tab 3 content</TabsPanel>
</Tabs>
```

## Patterns from coss particles

### Key patterns

Controlled tabs with external state:

```tsx
const [value, setValue] = useState("tab-1")

<Tabs value={value} onValueChange={setValue}>
  <TabsList>
    <TabsTab value="tab-1">Tab 1</TabsTab>
    <TabsTab value="tab-2">Tab 2</TabsTab>
  </TabsList>
  <TabsPanel value="tab-1">Content 1</TabsPanel>
  <TabsPanel value="tab-2">Content 2</TabsPanel>
</Tabs>
```

Underline variant:

```tsx
<Tabs defaultValue="tab-1" variant="underline">
  <TabsList>
    <TabsTab value="tab-1">Tab 1</TabsTab>
    <TabsTab value="tab-2">Tab 2</TabsTab>
  </TabsList>
  ...
</Tabs>
```

### More examples

- underline variant: `p-tabs-2`
- vertical orientation: `p-tabs-3`
- underline with vertical orientation: `p-tabs-4`

## Common pitfalls

- Mismatching `TabsTab value` and `TabsPanel value` pairs.
- Using tabs for workflows that require route-level navigation instead.
- Mounting expensive panel content without considering visibility/performance.

## Useful particle references

See `p-tabs-1` through `p-tabs-4` for variants and orientations. Related: `p-toolbar-1`, `p-card-1`.
