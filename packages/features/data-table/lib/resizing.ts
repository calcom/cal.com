import type { Table, ColumnSizingState } from "@tanstack/react-table";
// eslint-disable-next-line no-restricted-imports
import debounce from "lodash/debounce";
import { useState, useCallback, useEffect } from "react";

type UsePersistentColumnResizingProps<TData> = {
  enabled: boolean;
  table: Table<TData>;
  identifier?: string;
};

function getLocalStorageKey(identifier: string) {
  return `data-table-column-sizing-${identifier}`;
}

function loadColumnSizing(identifier: string) {
  try {
    return JSON.parse(localStorage.getItem(getLocalStorageKey(identifier)) || "{}");
  } catch (error) {
    return {};
  }
  return {};
}

function saveColumnSizing(identifier: string, columnSizing: ColumnSizingState) {
  localStorage.setItem(getLocalStorageKey(identifier), JSON.stringify(columnSizing));
}

const debouncedSaveColumnSizing = debounce(saveColumnSizing, 1000);

export function usePersistentColumnResizing<TData>({
  enabled,
  table,
  identifier,
}: UsePersistentColumnResizingProps<TData>) {
  const [_, setColumnSizing] = useState<ColumnSizingState>({});

  const onColumnSizingChange = useCallback(
    (updater: ColumnSizingState | ((old: ColumnSizingState) => ColumnSizingState)) => {
      // `!identifier` is checked already in the `useEffect` hook,
      // but TS doesn't know that, and this won't happen.
      if (!identifier) return;

      table.setState((oldTableState) => {
        const newColumnSizing = typeof updater === "function" ? updater(oldTableState.columnSizing) : updater;
        debouncedSaveColumnSizing(identifier, newColumnSizing);
        setColumnSizing(newColumnSizing);

        return {
          ...oldTableState,
          columnSizing: newColumnSizing,
        };
      });
    },
    [identifier, table]
  );

  useEffect(() => {
    if (!enabled || !identifier) return;

    const newColumnSizing = loadColumnSizing(identifier);
    setColumnSizing(newColumnSizing);
    table.setState((old) => ({
      ...old,
      columnSizing: newColumnSizing,
    }));
    table.setOptions((prev) => ({
      ...prev,
      columnResizeMode: "onChange",
      onColumnSizingChange,
    }));
  }, [enabled, identifier, table, onColumnSizingChange]);
}
