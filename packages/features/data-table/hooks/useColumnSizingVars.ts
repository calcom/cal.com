import type { Table } from "@tanstack/react-table";
// eslint-disable-next-line no-restricted-imports
import kebabCase from "lodash/kebabCase";
import { useMemo } from "react";

import { useDebouncedWidth } from "./useDebouncedWidth";

export const useColumnSizingVars = <TData>({
  table,
  tableContainerRef,
}: {
  table: Table<TData>;
  tableContainerRef: React.RefObject<HTMLDivElement>;
}) => {
  const debouncedContainerWidth = useDebouncedWidth(tableContainerRef);

  return useMemo(() => {
    const headers = table.getFlatHeaders();
    const hasAutoWidthColumn = headers.some((header) => header.column.columnDef.meta?.autoWidth);
    if (hasAutoWidthColumn) {
      const colSizes: { [key: string]: string } = {};
      headers.forEach((header) => {
        const isAutoWidth = header.column.columnDef.meta?.autoWidth;
        colSizes[`--header-${kebabCase(header.id)}-size`] = isAutoWidth ? "auto" : `${header.getSize()}px`;
        colSizes[`--col-${kebabCase(header.column.id)}-size`] = isAutoWidth
          ? "auto"
          : `${header.column.getSize()}px`;
      });
      return colSizes;
    } else {
      const colSizes: { [key: string]: string } = {};
      const totalColumnsWidth = headers.reduce((total, header) => total + header.getSize(), 0);
      const widthDifference = Math.max(0, debouncedContainerWidth - totalColumnsWidth);
      const widthPerColumn = Math.floor(widthDifference / headers.length);
      const extraWidth = widthDifference - widthPerColumn * headers.length;
      headers.forEach((header, index) => {
        const size = header.getSize() + widthPerColumn + (index === headers.length - 1 ? extraWidth : 0);
        colSizes[`--header-${kebabCase(header.id)}-size`] = `${size}px`;
        colSizes[`--col-${kebabCase(header.column.id)}-size`] = `${size}px`;
      });

      return colSizes;
    }
  }, [
    debouncedContainerWidth,
    table.getFlatHeaders(),
    table.getState().columnSizingInfo,
    table.getState().columnSizing,
  ]);
};
