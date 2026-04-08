# coss vs shadcn/Radix assumptions

Use this guide when adapting snippets that were originally written with shadcn/Radix mental models.

## Core idea

coss is close to shadcn ergonomically, but its primitives and composition model are aligned to Base UI patterns.

## High-impact differences

- Do not assume every shadcn pattern translates 1:1.
- Verify trigger and popup composition from coss docs before coding.
- Apply `asChild` -> `render` only on coss parts that explicitly support `render`.
- Prefer coss component names and exports as documented (`DialogPopup`, `MenuPopup`, `SelectPopup`, etc.).
- Some legacy aliases may exist, but primary coss names should be preferred in new examples.
- Prefer styled coss exports by default (for example `Slider`, `SliderValue`) and use `*Primitive` only for advanced/custom composition.
- When only Base UI helpers are needed (`useRender`, `mergeProps`, `CSPProvider`, `DirectionProvider`), prefer `@coss/ui/base-ui/*` re-exports over direct `@base-ui/react` dependency.
- For Select migration, replace children-only option derivation with an `items`-first pattern where possible, then map options consistently in `SelectPopup`.

## Practical migration examples

Use these snippets as fast conversion templates when migrating shadcn/Radix code.

### Composition: `asChild` -> `render`

```tsx
// shadcn/Radix
<DialogTrigger asChild>
  <Button variant="outline">Open</Button>
</DialogTrigger>
```

```tsx
// coss/Base UI
<DialogTrigger render={<Button variant="outline" />}>Open</DialogTrigger>
```

### Menu actions: `onSelect` -> `onClick`

```tsx
// shadcn/Radix
<DropdownMenuItem onSelect={handleOpen}>Open</DropdownMenuItem>
```

```tsx
// coss/Base UI
<MenuItem onClick={handleOpen}>Open</MenuItem>
```

### Select: `items`-first + placeholder on `SelectValue`

```tsx
// shadcn/Radix
<Select>
  <SelectTrigger>
    <SelectValue placeholder="Select a framework" />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="next">Next.js</SelectItem>
    <SelectItem value="vite">Vite</SelectItem>
  </SelectContent>
</Select>
```

```tsx
// coss/Base UI
const items = [
  { label: "Next.js", value: "next" },
  { label: "Vite", value: "vite" },
];

<Select items={items}>
  <SelectTrigger>
    <SelectValue placeholder="Select a framework" />
  </SelectTrigger>
  <SelectPopup alignItemWithTrigger={false}>
    {items.map((item) => (
      <SelectItem key={item.value} value={item.value}>
        {item.label}
      </SelectItem>
    ))}
  </SelectPopup>
</Select>
```

### Toggle Group: `type` -> `multiple`

```tsx
// shadcn/Radix
<ToggleGroup type="single" defaultValue="daily">
  <ToggleGroupItem value="daily">Daily</ToggleGroupItem>
  <ToggleGroupItem value="weekly">Weekly</ToggleGroupItem>
</ToggleGroup>
```

```tsx
// coss/Base UI
<ToggleGroup defaultValue={["daily"]}>
  <Toggle value="daily">Daily</Toggle>
  <Toggle value="weekly">Weekly</Toggle>
</ToggleGroup>
```

### Slider: scalar single-value usage in coss

```tsx
// shadcn/Radix
<Slider defaultValue={[50]} max={100} step={1} />
```

```tsx
// coss/Base UI
<Slider defaultValue={50} max={100} step={1} />
```

### Accordion: `type/collapsible` -> coss defaults

```tsx
// shadcn/Radix
<Accordion type="single" collapsible defaultValue="item-1">
  <AccordionItem value="item-1">...</AccordionItem>
</Accordion>
```

```tsx
// coss/Base UI
<Accordion defaultValue={["item-1"]}>
  <AccordionItem value="item-1">...</AccordionItem>
</Accordion>
```

## Migration checklist

1. Confirm the exact coss imports from docs.
2. Confirm child structure requirements (trigger/header/panel/footer/items/groups).
3. Confirm prop names and semantics from the coss docs page.
4. Validate with at least one coss particle example.

## Per-component migration notes

For the full component registry, see `../component-registry.md`.

## Anti-patterns

- Copy/paste shadcn examples and only change import path.
- Using undocumented props because they exist in other ecosystems.
- Omitting required subcomponents in overlays/forms because the source snippet did.
