# coss Calendar

## When to use

- Date selection interfaces and calendar-based scheduling UIs.
- Single-date, range, and constrained date picking patterns.

## Install

```bash
npx shadcn@latest add @coss/calendar
```

Manual deps from docs:

```bash
npm install react-day-picker
```

## Canonical imports

```tsx
import { Calendar } from "@/components/ui/calendar"
```

## Minimal pattern

```tsx
<Calendar mode="single" />
```

## Patterns from coss particles

### Key patterns

Single date selection with state:

```tsx
const [date, setDate] = useState<Date | undefined>()

<Calendar mode="single" selected={date} onSelect={setDate} />
```

Date range selection:

```tsx
const [range, setRange] = useState<DateRange | undefined>()

<Calendar mode="range" selected={range} onSelect={setRange} />
```

### More examples

See `p-calendar-1` through `p-calendar-6` for single, range, dropdown navigation, and month/year select patterns.

## Common pitfalls

- Using calendar for free-text date input flows better handled by date fields.
- Missing locale/disabled-date constraints for business rules.
- Treating calendar as date-time picker without explicit time UI.

## Useful particle references

- single date selection: `p-calendar-2`
- date range selection: `p-calendar-3`
- dropdown navigation: `p-calendar-4`
- select dropdown for month/year: `p-calendar-5`
- combobox dropdown for month/year: `p-calendar-6`
