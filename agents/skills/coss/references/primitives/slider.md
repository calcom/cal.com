# coss Slider

## When to use

- Continuous or ranged numeric tuning interactions.
- Volume/brightness/threshold controls with immediate feedback.

## Install

```bash
npx shadcn@latest add @coss/slider
```

Manual deps from docs:

```bash
npm install @base-ui/react
```

## Canonical imports

```tsx
import { Slider, SliderValue } from "@/components/ui/slider"
```

## Minimal pattern

```tsx
<Slider aria-label="Volume" defaultValue={40} max={100} min={0} />
```

## Patterns from coss particles

### Key patterns

Slider with label and live value display:

```tsx
<div className="flex flex-col gap-2">
  <div className="flex justify-between text-sm">
    <Label>Volume</Label>
    <SliderValue />
  </div>
  <Slider aria-label="Volume" defaultValue={50} min={0} max={100} />
</div>
```

Range slider (two thumbs):

```tsx
<Slider aria-label="Price range" defaultValue={[20, 80]} min={0} max={100} />
```

### More examples

See `p-slider-1` through `p-slider-5` for label, range, vertical, and form integration patterns.

## Common pitfalls

- Using slider for discrete option labels where select/radio is clearer.
- Not exposing current value context in nearby UI text when needed.
- Confusing single-value vs range value shapes in controlled mode.

## Useful particle references

- with label and value: `p-slider-2`
- range slider: `p-slider-3`
- vertical: `p-slider-4`
- form integration: `p-slider-5`
