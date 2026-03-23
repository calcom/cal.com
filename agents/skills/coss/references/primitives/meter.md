# coss Meter

## When to use

- Bounded scalar measurement display (not task progress).
- Quality/capacity indicators with min/max semantics.

## When NOT to use

- If displaying task completion or async progress -> use Progress instead.
- If the indicator is indeterminate -> use Spinner or Progress instead.

## Install

```bash
npx shadcn@latest add @coss/meter
```

Manual deps from docs:

```bash
npm install @base-ui/react
```

## Canonical imports

```tsx
import { Meter, MeterLabel, MeterValue } from "@/components/ui/meter"
```

## Minimal pattern

```tsx
<Meter value={40}>
  <MeterLabel>Progress</MeterLabel>
  <MeterValue />
</Meter>
```

## Patterns from coss particles

### Key patterns

Meter with formatted value and range:

```tsx
<Meter value={75} min={0} max={100}>
  <div className="flex justify-between text-sm">
    <MeterLabel>Storage</MeterLabel>
    <MeterValue>{({ formattedValue }) => `${formattedValue} used`}</MeterValue>
  </div>
</Meter>
```

Minimal meter without label:

```tsx
<Meter value={40} aria-label="Progress" />
```

### More examples

See `p-meter-1` through `p-meter-4` for label, formatted value, and range patterns.

## Common pitfalls

- Using meter to represent completion tasks better suited for `Progress`.
- Missing min/max context when values are not obvious to the user.
- Treating meter as interactive control rather than read-only indicator.

## Useful particle references

- without label and value: `p-meter-2`
- with formatted value: `p-meter-3`
- with range: `p-meter-4`
