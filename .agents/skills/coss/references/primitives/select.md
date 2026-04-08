# coss Select

## When to use

- Single-choice selection from a predefined list.
- Select-style triggers with popup options.

## When NOT to use

- If the user needs to type/filter options -> use Combobox instead.
- If the list is very short (2-3 items) with visible options -> consider RadioGroup.
- If the selection drives complex search/autocomplete -> use Autocomplete instead.

## Install

```bash
npx shadcn@latest add @coss/select
```

Manual deps:

```bash
npm install @base-ui/react
```

## Canonical imports

```tsx
import {
  Select,
  SelectGroup,
  SelectGroupLabel,
  SelectItem,
  SelectLabel,
  SelectPopup,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
```

## Minimal pattern

```tsx
const items = [
  { label: "Next.js", value: "next" },
  { label: "Vite", value: "vite" },
]

<Select items={items}>
  <SelectTrigger>
    <SelectValue placeholder="Select framework" />
  </SelectTrigger>
  <SelectPopup>
    <SelectLabel>Frameworks</SelectLabel>
    {items.map((item) => (
      <SelectItem key={item.value} value={item}>
        {item.label}
      </SelectItem>
    ))}
  </SelectPopup>
</Select>
```

Prefer this `items`-first pattern for migration work to keep options known before hydration and avoid SSR mismatch edge cases.

For form-bound selects, prefer wrapping with `Field` + `FieldLabel` + `FieldError` so value, label, and validation stay semantically linked.

## Patterns from coss particles

- **Field composition**: in forms, place `Select` inside `Field` wrappers (see `p-select-23`, `p-form-1`, `p-form-2`).
- **Trigger composition**: keep `SelectTrigger` as the interaction entry point and avoid Radix `asChild` assumptions from other primitives; where composition is needed, prefer documented coss/Base UI `render` patterns for supported parts.
- **Multiple selection**: use `multiple` with array values (for example `defaultValue={["javascript", "typescript"]}`) and a custom `SelectValue` render function for compact summaries.
- **Object values**: use full objects in `SelectItem value={item}` with `itemToStringValue` for stable form value serialization.
- **Grouped options**: use `SelectGroup` + `SelectGroupLabel`; combine with `SelectSeparator` between groups when needed.
- **Disabled options**: pass `disabled` on individual `SelectItem` rows (for unavailable choices).
- **Rich row/trigger rendering**: render custom content (icons, avatars, secondary text) in both `SelectValue` and `SelectItem`; adjust row density via `className` where needed.
- **Alignment tuning**: use `alignItemWithTrigger={false}` only when the default selected-item alignment causes layout issues.

## Common pitfalls

- Keeping children-only Radix select patterns without adding `items`.
- Forgetting to render `SelectValue` inside `SelectTrigger`.
- Placing placeholder on the wrong part; use `placeholder` on `SelectValue` when needed.
- Using object item values without `itemToStringValue` when stable string value serialization is required.
- Treating `multiple` select values as scalars instead of arrays.
- Mixing select and combobox APIs without validating docs.

## Useful particle references

- basic select + sizing: `p-select-1`, `p-select-2`, `p-select-3`
- grouped/labeled/select field patterns: `p-select-6`, `p-select-11`, `p-select-23`
- multiple selection summary rendering: `p-select-7`
- object values + rich option content: `p-select-10`, `p-select-17`, `p-select-20`
- disabled options: `p-select-12`
- related pattern: `p-combobox-18` (`SelectButton` with combobox trigger)

