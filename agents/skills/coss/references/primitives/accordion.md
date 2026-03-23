# coss Accordion

## When to use

- Expandable multi-section content regions.
- FAQs and settings pages with progressive disclosure.

## Install

```bash
npx shadcn@latest add @coss/accordion
```

Manual deps from docs:

```bash
npm install @base-ui/react
```

## Canonical imports

```tsx
import {
  Accordion,
  AccordionItem,
  AccordionPanel,
  AccordionTrigger,
} from "@/components/ui/accordion"
```

## Minimal pattern

```tsx
<Accordion defaultValue={["item-1"]}>
  <AccordionItem value="item-1">
    <AccordionTrigger>What is Base UI?</AccordionTrigger>
    <AccordionPanel>
      Base UI is a library of high-quality unstyled React components.
    </AccordionPanel>
  </AccordionItem>
</Accordion>
```

## Patterns from coss particles

### Key patterns

Multiple panels open simultaneously:

```tsx
<Accordion multiple defaultValue={["item-1", "item-2"]}>
  <AccordionItem value="item-1">
    <AccordionTrigger>Section 1</AccordionTrigger>
    <AccordionPanel>Content 1</AccordionPanel>
  </AccordionItem>
  <AccordionItem value="item-2">
    <AccordionTrigger>Section 2</AccordionTrigger>
    <AccordionPanel>Content 2</AccordionPanel>
  </AccordionItem>
</Accordion>
```

Controlled mode with external state:

```tsx
const [value, setValue] = useState<string[]>(["item-1"])

<Accordion value={value} onValueChange={setValue}>
  ...
</Accordion>
```

Each `AccordionItem` needs a stable `value`; trigger and panel must be children of the same item.

### More examples

See `p-accordion-1` through `p-accordion-4` for mapped items, single-open, multiple-open, and controlled patterns.

## Common pitfalls

- Placing `AccordionTrigger`/`AccordionPanel` outside `AccordionItem`.
- Omitting `value` on `AccordionItem`, which breaks item identity and controlled behavior.
- Applying Radix mental models like `type="single" | "multiple"` instead of coss `multiple` + array values.
- Treating controlled `value` as scalar instead of `string[]`.

## Useful particle references

- baseline mapped-items accordion: `p-accordion-1`
- single-open static sections: `p-accordion-2`
- multiple-open behavior: `p-accordion-3`
- controlled value + external actions: `p-accordion-4`

