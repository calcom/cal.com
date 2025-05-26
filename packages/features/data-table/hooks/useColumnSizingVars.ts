import type { Table } from "@tanstack/react-table";
// eslint-disable-next-line no-restricted-imports
import kebabCase from "lodash/kebabCase";
import { useMemo } from "react";

export const useColumnSizingVars = <TData>({ table }: { table: Table<TData> }) => {
  const headers = table.getFlatHeaders();
  const columnSizingInfo = table.getState().columnSizingInfo;
  const columnSizing = table.getState().columnSizing;

  return useMemo(() => {
    const headers = table.getFlatHeaders();
    const colSizes: { [key: string]: string } = {};
    headers.forEach((header) => {
      const isAutoWidth = header.column.columnDef.meta?.autoWidth;
      colSizes[`--header-${kebabCase(header.id)}-size`] = isAutoWidth ? "auto" : `${header.getSize()}px`;
      colSizes[`--col-${kebabCase(header.column.id)}-size`] = isAutoWidth
        ? "auto"
        : `${header.column.getSize()}px`;
    });
    return colSizes;
    // `columnSizing` and `columnSizingInfo` are not used in the memo,
    // but they're included in the deps to ensure the memo is re-evaluated when they change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [headers, columnSizingInfo, columnSizing]);
};
