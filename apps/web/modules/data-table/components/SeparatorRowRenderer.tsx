import type { SeparatorRow } from "@calcom/features/data-table/lib/separator";
import classNames from "@calcom/ui/classNames";
import { TableCell } from "@calcom/ui/components/table/TableNew";

export function SeparatorRowRenderer({
  separator,
  className,
}: {
  separator: SeparatorRow;
  className?: string;
}): JSX.Element {
  return (
    <TableCell
      className={classNames(
        "w-full bg-cal-muted px-3 py-2 font-semibold text-emphasis",
        separator.className,
        className
      )}>
      {separator.label}
    </TableCell>
  );
}
