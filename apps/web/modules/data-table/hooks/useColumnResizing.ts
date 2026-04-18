"use client";

import type { ColumnSizingState, Header, Table } from "@tanstack/react-table";
// eslint-disable-next-line no-restricted-imports
import debounce from "lodash/debounce";
import { useCallback, useEffect, useMemo, useRef } from "react";
import { useDataTable, useDebouncedWidth } from ".";

type UseColumnResizingProps<TData> = {
  enabled: boolean;
  table: Table<TData>;
  tableContainerRef: React.RefObject<HTMLDivElement>;
};

function getAdjustedColumnSizing<TData>({
  headers,
  containerWidth,
  initialColumnSizing,
  currentColumnSizing,
  resizedColumns,
}: {
  headers: Header<TData, unknown>[];
  containerWidth: number;
  initialColumnSizing: ColumnSizingState;
  currentColumnSizing: ColumnSizingState;
  resizedColumns: Set<string>;
}) {
  // Return early if any column has auto width
  const hasAutoWidthColumn = headers.some((header) => header.column.columnDef.meta?.autoWidth);
  if (hasAutoWidthColumn) {
    return currentColumnSizing;
  }

  const getColumnSize = (header: Header<TData, unknown>) => {
    const id = header.id;
    if (!initialColumnSizing[id]) {
      initialColumnSizing[id] = header.getSize();
    }
    if (resizedColumns.has(id)) {
      return currentColumnSizing[id] ?? initialColumnSizing[id];
    }
    return initialColumnSizing[id];
  };

  const isAdjustable = (header: Header<TData, unknown>) =>
    header.column.columnDef.enableResizing !== false && !resizedColumns.has(header.id);

  // Calculate how many columns can be adjusted
  const numberOfAdjustableColumns = headers.filter(isAdjustable).length;

  // Calculate widths and required adjustments
  const totalColumnsWidth = headers.reduce((total, header) => total + getColumnSize(header), 0);
  const widthToFill = Math.max(0, containerWidth - totalColumnsWidth);
  const widthPerAdjustableColumn =
    numberOfAdjustableColumns === 0 ? 0 : Math.floor(widthToFill / numberOfAdjustableColumns);

  // Handle any leftover width (due to rounding)
  const leftoverWidth = widthToFill - widthPerAdjustableColumn * numberOfAdjustableColumns;

  // Build the new column sizing object
  const newColumnSizing = headers.reduce((acc, header, index) => {
    const baseWidth = getColumnSize(header);
    const adjustmentWidth = isAdjustable(header) ? widthPerAdjustableColumn : 0;
    const isLastColumn = index === headers.length - 1;
    const extraWidth = isLastColumn ? leftoverWidth : 0;

    acc[header.id] = baseWidth + adjustmentWidth + extraWidth;
    return acc;
  }, {} as ColumnSizingState);

  return newColumnSizing;
}

function getPartialColumnSizing(columnSizing: ColumnSizingState, columnsToExtract: Set<string>) {
  return Object.keys(columnSizing).reduce((acc, key) => {
    if (columnsToExtract.has(key)) {
      acc[key] = columnSizing[key];
    }
    return acc;
  }, {} as ColumnSizingState);
}

export function useColumnResizing<TData>({
  enabled,
  table,
  tableContainerRef,
}: UseColumnResizingProps<TData>) {
  const initialized = useRef(false);
  const columnSizing = useRef<ColumnSizingState>({});
  const initialColumnSizing = useRef<ColumnSizingState>({});
  const resizedColumns = useRef<Set<string>>(new Set());
  const { columnSizing: loadedColumnSizing, setColumnSizing: setColumnSizingToContext } = useDataTable();

  const debouncedSaveColumnSizing = useMemo(
    () => debounce(setColumnSizingToContext, 1000),
    [setColumnSizingToContext]
  );

  const adjustColumnSizing = useCallback(
    (updater: ColumnSizingState | ((old: ColumnSizingState) => ColumnSizingState)) => {
      table.setState((oldTableState) => {
        let newColumnSizing = typeof updater === "function" ? updater(oldTableState.columnSizing) : updater;
        newColumnSizing = getAdjustedColumnSizing({
          headers: table.getFlatHeaders(),
          containerWidth: tableContainerRef.current?.clientWidth || 0,
          initialColumnSizing: initialColumnSizing.current,
          currentColumnSizing: newColumnSizing,
          resizedColumns: resizedColumns.current,
        });
        debouncedSaveColumnSizing(getPartialColumnSizing(newColumnSizing, resizedColumns.current));
        columnSizing.current = newColumnSizing;

        return {
          ...oldTableState,
          columnSizing: newColumnSizing,
        };
      });
    },
    [table, tableContainerRef, debouncedSaveColumnSizing]
  );

  const onColumnSizingChange = useCallback(
    (updater: ColumnSizingState | ((old: ColumnSizingState) => ColumnSizingState)) => {
      const isResizingColumn = table.getState().columnSizingInfo.isResizingColumn;
      if (isResizingColumn) {
        resizedColumns.current.add(isResizingColumn);
      }
      adjustColumnSizing(updater);
    },
    [table, adjustColumnSizing]
  );

  const debouncedContainerWidth = useDebouncedWidth(tableContainerRef);

  useEffect(() => {
    if (!enabled || !initialized.current) return;
    const newColumnSizing = getAdjustedColumnSizing({
      headers: table.getFlatHeaders(),
      containerWidth: debouncedContainerWidth,
      initialColumnSizing: initialColumnSizing.current,
      currentColumnSizing: columnSizing.current,
      resizedColumns: resizedColumns.current,
    });

    columnSizing.current = newColumnSizing;
    table.setState((old) => ({
      ...old,
      columnSizing: newColumnSizing,
    }));
  }, [debouncedContainerWidth, table.getFlatHeaders().length]);

  useEffect(() => {
    if (!enabled) return;

    // loadedColumnSizing is a partial object of explicitly resized columns.
    // combine loaded sizes and the default sizes from TanStack Table
    initialColumnSizing.current = table.getFlatHeaders().reduce((acc, header) => {
      acc[header.id] = loadedColumnSizing[header.id] || header.getSize();
      return acc;
    }, {} as ColumnSizingState);

    columnSizing.current = loadedColumnSizing;
    resizedColumns.current = new Set(Object.keys(loadedColumnSizing));

    table.setState((old) => ({
      ...old,
      columnSizing: loadedColumnSizing,
    }));
    table.setOptions((prev) => ({
      ...prev,
      columnResizeMode: "onChange",
      onColumnSizingChange,
    }));

    initialized.current = true;
  }, [enabled, table, onColumnSizingChange]);
}
