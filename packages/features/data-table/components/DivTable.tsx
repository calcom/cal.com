import * as React from "react";

import classNames from "@calcom/ui/classNames";

const DivTable = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      role="table"
      className={classNames("border-subtle w-full caption-bottom border text-sm", className)}
      {...props}
    />
  )
);
DivTable.displayName = "DivTable";

const DivTableHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} role="rowgroup" className={classNames("md:z-10", className)} {...props} />
  )
);
DivTableHeader.displayName = "DivTableHeader";

const DivTableBody = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      role="rowgroup"
      className={classNames("[&_[role=row]:last-child]:border-0", className)}
      {...props}
    />
  )
);
DivTableBody.displayName = "DivTableBody";

const DivTableFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      role="rowgroup"
      className={classNames("bg-default text-emphasis font-medium", className)}
      {...props}
    />
  )
);
DivTableFooter.displayName = "DivTableFooter";

const DivTableRow = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      role="row"
      className={classNames(
        "hover:bg-muted data-[state=selected]:bg-subtle border-subtle border-b transition",
        className
      )}
      {...props}
    />
  )
);
DivTableRow.displayName = "DivTableRow";

const DivTableHead = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      role="columnheader"
      className={classNames(
        "text-default h-12 px-2 text-left align-middle font-medium [&:has([role=checkbox])]:pr-0",
        className
      )}
      {...props}
    />
  )
);
DivTableHead.displayName = "DivTableHead";

const DivTableCell = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      role="cell"
      className={classNames("text-default px-2 py-2.5 align-middle [&:has([role=checkbox])]:pr-0", className)}
      {...props}
    />
  )
);
DivTableCell.displayName = "DivTableCell";

const DivTableCaption = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={classNames("text-default mt-4 text-sm", className)} {...props} />
  )
);
DivTableCaption.displayName = "DivTableCaption";

export {
  DivTable as Table,
  DivTableHeader as TableHeader,
  DivTableBody as TableBody,
  DivTableFooter as TableFooter,
  DivTableHead as TableHead,
  DivTableRow as TableRow,
  DivTableCell as TableCell,
  DivTableCaption as TableCaption,
};
