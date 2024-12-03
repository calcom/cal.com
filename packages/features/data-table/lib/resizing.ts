import type { Table, ColumnSizingState } from "@tanstack/react-table";
// eslint-disable-next-line no-restricted-imports
import debounce from "lodash/debounce";
import { useState, useCallback, useEffect } from "react";

type UsePersistentColumnResizingProps<TData> = {
  table: Table<TData>;
  name: string;
};

function getLocalStorageKey(name: string) {
  return `data-table-column-sizing-${name}`;
}

function loadColumnSizing(name: string) {
  try {
    return JSON.parse(localStorage.getItem(getLocalStorageKey(name)) || "{}");
  } catch (error) {
    return {};
  }
  return {};
}

function saveColumnSizing(name: string, columnSizing: ColumnSizingState) {
  localStorage.setItem(getLocalStorageKey(name), JSON.stringify(columnSizing));
}

const debouncedSaveColumnSizing = debounce(saveColumnSizing, 1000);

export function usePersistentColumnResizing<TData>({ table, name }: UsePersistentColumnResizingProps<TData>) {
  const [columnSizing, setColumnSizing] = useState<ColumnSizingState>({});

  useEffect(() => {
    const newColumnSizing = loadColumnSizing(name);
    setColumnSizing(newColumnSizing);
    table.setState((old) => ({
      ...old,
      columnSizing: newColumnSizing,
    }));
  }, [name, table]);

  const onColumnSizingChange = useCallback(
    (updater: ColumnSizingState | ((old: ColumnSizingState) => ColumnSizingState)) => {
      const newColumnSizing = typeof updater === "function" ? updater(columnSizing) : updater;
      debouncedSaveColumnSizing(name, newColumnSizing);
      setColumnSizing(newColumnSizing);
      table.setState((old) => ({
        ...old,
        columnSizing: newColumnSizing,
      }));
    },
    [columnSizing, table]
  );

  useEffect(() => {
    table.setOptions((prev) => ({
      ...prev,
      onColumnSizingChange,
    }));
  }, [table, columnSizing, onColumnSizingChange]);
}
