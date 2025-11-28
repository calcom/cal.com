"use client";

import { useDataTable } from "../../hooks";
import type { FilterableColumn } from "../../lib/types";
import { ZMultiSelectFilterValue, ColumnFilterType } from "../../lib/types";
import type { FilterType } from "@calcom/types/data-table";
import { BaseSelectFilterOptions } from "./BaseSelectFilterOptions";

export type MultiSelectFilterOptionsProps = {
  column: Extract<FilterableColumn, { type: Extract<FilterType, "ms"> }>;
};

export function MultiSelectFilterOptions({ column }: MultiSelectFilterOptionsProps) {
  const { updateFilter } = useDataTable();

  return (
    <BaseSelectFilterOptions<Extract<FilterType, "ms">>
      column={column}
      filterValueSchema={ZMultiSelectFilterValue}
      testIdPrefix="select-filter-options"
      isOptionSelected={(filterValue, optionValue) => {
        if (!filterValue?.data) return false;
        return filterValue.data.includes(optionValue);
      }}
      onOptionSelect={(column, filterValue, optionValue) => {
        const currentData = filterValue?.data ?? [];
        const newFilterValue = currentData.includes(optionValue)
          ? currentData.filter((value) => value !== optionValue)
          : [...currentData, optionValue];
        updateFilter(column.id, { type: ColumnFilterType.MULTI_SELECT, data: newFilterValue });
      }}
    />
  );
}
