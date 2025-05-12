"use client";

import { useDataTable } from "../../hooks";
import type { FilterableColumn } from "../../lib/types";
import { ZSingleSelectFilterValue, ColumnFilterType } from "../../lib/types";
import { BaseSelectFilterOptions } from "./BaseSelectFilterOptions";

export type SingleSelectFilterOptionsProps = {
  column: Extract<FilterableColumn, { type: ColumnFilterType.SINGLE_SELECT }>;
};

export function SingleSelectFilterOptions({ column }: SingleSelectFilterOptionsProps) {
  const { updateFilter } = useDataTable();

  return (
    <BaseSelectFilterOptions<ColumnFilterType.SINGLE_SELECT>
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
