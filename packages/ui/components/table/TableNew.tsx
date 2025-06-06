import * as React from "react";

import classNames from "@calcom/ui/classNames";

const Table = function Table({
  ref: forwardedRef,
  className,
  ...props
}: React.HTMLAttributes<HTMLTableElement> & {
  ref?: React.RefObject<HTMLTableElement>;
}) {
  return (
    <table
      ref={forwardedRef}
      className={classNames("border-subtle w-full caption-bottom border text-sm", className)}
      {...props}
    />
  );
};
Table.displayName = "Table";

const TableHeader = function TableHeader({
  ref: forwardedRef,
  className,
  ...props
}: React.HTMLAttributes<HTMLTableSectionElement> & {
  ref?: React.RefObject<HTMLTableSectionElement>;
}) {
  return <thead ref={forwardedRef} className={classNames("md:z-10", className)} {...props} />;
};
TableHeader.displayName = "TableHeader";

const TableBody = function TableBody({
  ref: forwardedRef,
  className,
  ...props
}: React.HTMLAttributes<HTMLTableSectionElement> & {
  ref?: React.RefObject<HTMLTableSectionElement>;
}) {
  return (
    <tbody ref={forwardedRef} className={classNames("[&_tr:last-child]:border-0", className)} {...props} />
  );
};
TableBody.displayName = "TableBody";

const TableFooter = function TableFooter({
  ref: forwardedRef,
  className,
  ...props
}: React.HTMLAttributes<HTMLTableSectionElement> & {
  ref?: React.RefObject<HTMLTableSectionElement>;
}) {
  return (
    <tfoot
      ref={forwardedRef}
      className={classNames("bg-default text-emphasis font-medium", className)}
      {...props}
    />
  );
};
TableFooter.displayName = "TableFooter";

const TableRow = function TableRow({
  ref: forwardedRef,
  className,
  ...props
}: React.HTMLAttributes<HTMLTableRowElement> & {
  ref?: React.RefObject<HTMLTableRowElement>;
}) {
  return (
    <tr
      ref={forwardedRef}
      className={classNames(
        "hover:bg-muted data-[state=selected]:bg-subtle border-subtle border-b transition",
        className
      )}
      {...props}
    />
  );
};
TableRow.displayName = "TableRow";

const TableHead = function TableHead({
  ref: forwardedRef,
  className,
  ...props
}: React.ThHTMLAttributes<HTMLTableCellElement> & {
  ref?: React.RefObject<HTMLTableCellElement>;
}) {
  return (
    <th
      ref={forwardedRef}
      className={classNames(
        "text-default h-12 px-2 text-left align-middle font-medium [&:has([role=checkbox])]:pr-0",
        className
      )}
      {...props}
    />
  );
};
TableHead.displayName = "TableHead";

const TableCell = function TableCell({
  ref: forwardedRef,
  className,
  ...props
}: React.TdHTMLAttributes<HTMLTableCellElement> & {
  ref?: React.RefObject<HTMLTableCellElement>;
}) {
  return (
    <td
      ref={forwardedRef}
      className={classNames("text-default px-2 py-2.5 align-middle [&:has([role=checkbox])]:pr-0", className)}
      {...props}
    />
  );
};
TableCell.displayName = "TableCell";

const TableCaption = function TableCaption({
  ref: forwardedRef,
  className,
  ...props
}: React.HTMLAttributes<HTMLTableCaptionElement> & {
  ref?: React.RefObject<HTMLTableCaptionElement>;
}) {
  return (
    <caption ref={forwardedRef} className={classNames("text-default mt-4 text-sm", className)} {...props} />
  );
};
TableCaption.displayName = "TableCaption";

export { Table, TableHeader, TableBody, TableFooter, TableHead, TableRow, TableCell, TableCaption };
