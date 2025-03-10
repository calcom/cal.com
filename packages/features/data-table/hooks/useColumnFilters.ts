import { useCallback, useMemo } from "react";

import type { ColumnFilter } from "../lib/types";
import { ZFilterValue } from "../lib/types";
import { isMultiSelectFilterValue } from "../lib/utils";
import { useDataTable } from "./useDataTable";

export function useColumnFilters({ exclude }: { exclude?: string[] } = {}): ColumnFilter[] {
  const { activeFilters } = useDataTable();

  // Stringify the exclude array for stable memoization
  const excludeKey = useMemo(() => JSON.stringify(exclude?.sort()), [exclude]);

  // Now this will only change when the actual contents change
  const filterExcluded = useCallback(
    (filter: ColumnFilter) => !exclude?.includes(filter.id),
    [excludeKey] // Use the stringified key instead of the array
  );

  return useMemo(() => {
    return (activeFilters || [])
      .filter(
        (filter) =>
          typeof filter === "object" && filter && "f" in filter && "v" in filter && filter.v !== undefined
      )
      .map((filter) => {
        const parsedValue = ZFilterValue.safeParse(filter.v);
        if (!parsedValue.success) return null;
        return {
          id: filter.f,
          value: parsedValue.data,
        };
      })
      .filter((filter): filter is ColumnFilter => filter !== null)
      .filter(filterExcluded)
      .filter((filter) => {
        // The empty arrays in `filtersSearchState` keep the filter UI component,
        // but we do not send them to the actual query.
        // Otherwise, `{ my_column_name: { in: []} }` would result in nothing being returned.
        if (isMultiSelectFilterValue(filter.value) && filter.value.data.length === 0) {
          return false;
        }
        return true;
      });
  }, [activeFilters, filterExcluded]);
}
