"use client";

import { useDataTable } from "../../hooks";
import type { FilterableColumn } from "../../lib/types";
import { ZMultiSelectFilterValue, ColumnFilterType } from "../../lib/types";
import { BaseSelectFilterOptions } from "./BaseSelectFilterOptions";

export type MultiSelectFilterOptionsProps = {
  column: Extract<FilterableColumn, { type: ColumnFilterType.MULTI_SELECT }>;
};

export function MultiSelectFilterOptions({ column }: MultiSelectFilterOptionsProps) {
  const { updateFilter } = useDataTable();

  return (
    <BaseSelectFilterOptions
      column={column}
      filterSchema={ZMultiSelectFilterValue}
      testIdPrefix="multi-select-options"
      isOptionSelected={(filterValue, optionValue) => filterValue?.data.includes(optionValue)}
      onOptionSelect={(column, filterValue, optionValue) => {
        const newFilterValue = filterValue?.data.includes(optionValue)
          ? filterValue?.data.filter((value) => value !== optionValue)
          : [...(filterValue?.data || []), optionValue];
        updateFilter(column.id, { type: ColumnFilterType.MULTI_SELECT, data: newFilterValue });
      }}
    />
  );
}
