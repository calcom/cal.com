# coss Table

## When to use

- Structured tabular datasets.
- Sortable/filterable row and column displays.

## Install

```bash
npx shadcn@latest add @coss/table
```

Manual deps from docs:

```bash
# No extra runtime dependency required for basic table usage.
# For interactive data tables, add TanStack Table:
npm install @tanstack/react-table
```

## Canonical imports

```tsx
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
```

## Minimal pattern

```tsx
<Table>
  <TableHeader>
    <TableRow>
      <TableHead>Name</TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    <TableRow>
      <TableCell>Ada Lovelace</TableCell>
    </TableRow>
  </TableBody>
</Table>
```

## Patterns from coss particles

- **Semantic baseline**: start with `TableHeader`/`TableBody`/`TableRow`/`TableHead`/`TableCell`, then add `TableCaption` and `TableFooter` as needed.
- **Framed surfaces**: wrap table in `Frame` for bordered app-surface presentation (`p-table-2` and advanced variants).
- **Status-rich rows**: combine `Badge` and decorative dots/icons for state columns while keeping text primary.
- **Interactive data grids**: pair coss table parts with TanStack Table (`flexRender`, row models, selection state) for sorting/pagination/selection.
- **No-results state**: always render an explicit empty-state row with `colSpan` matching visible columns.
- **Fixed layout control**: use `className="table-fixed"` and column width styles when predictable column sizing is required.

## Common pitfalls

- Assuming `Table` itself provides sorting/filter/pagination state; these come from your data layer (for example TanStack Table).
- Mixing header/body cell semantics (`TableHead` in body rows or `TableCell` in headers).
- Forgetting to align `colSpan` with actual visible columns in footer/empty rows.
- Using table patterns where card/list layouts are more suitable on small screens without responsive handling.
- Omitting `aria-label` for row-selection checkboxes in interactive tables.

## Useful particle references

- basic semantic table with caption/footer: `p-table-1`
- framed table layout: `p-table-2`
- TanStack integration with row selection: `p-table-3`
- TanStack sorting + pagination + footer controls: `p-table-4`

