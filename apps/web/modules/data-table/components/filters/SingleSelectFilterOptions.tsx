"use client";

import type { FilterType } from "@calcom/types/data-table";

import { useDataTable } from "@calcom/features/data-table/hooks";
import type { FilterableColumn } from "@calcom/features/data-table/lib/types";
import { ZSingleSelectFilterValue, ColumnFilterType } from "@calcom/features/data-table/lib/types";
import { BaseSelectFilterOptions } from "./BaseSelectFilterOptions";

export type SingleSelectFilterOptionsProps = {
  column: Extract<FilterableColumn, { type: Extract<FilterType, "ss"> }>;
};

export function SingleSelectFilterOptions({ column }: SingleSelectFilterOptionsProps) {
  const { updateFilter } = useDataTable();

  return (
    <BaseSelectFilterOptions<Extract<FilterType, "ss">>
      column={column}
      filterValueSchema={ZSingleSelectFilterValue}
      testIdPrefix="select-filter-options"
      isOptionSelected={(filterValue, optionValue) => filterValue?.data === optionValue}
      onOptionSelect={(column, filterValue, optionValue) => {
        updateFilter(column.id, { type: ColumnFilterType.SINGLE_SELECT, data: optionValue });
      }}
    />
  );
}
