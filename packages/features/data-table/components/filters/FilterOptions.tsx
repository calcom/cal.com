"use client";

import type { FilterableColumn } from "../../lib/types";
import { ColumnFilterType } from "../../lib/types";
import { MultiSelectFilterOptions } from "./MultiSelectFilterOptions";
import { NumberFilterOptions } from "./NumberFilterOptions";
import { SingleSelectFilterOptions } from "./SingleSelectFilterOptions";
import { TextFilterOptions } from "./TextFilterOptions";

export type FilterOptionsProps = {
  column: FilterableColumn;
};

export function FilterOptions({ column }: FilterOptionsProps) {
  if (column.type === ColumnFilterType.TEXT) {
    return <TextFilterOptions column={column} />;
  } else if (column.type === ColumnFilterType.MULTI_SELECT) {
    return <MultiSelectFilterOptions column={column} />;
  } else if (column.type === ColumnFilterType.SINGLE_SELECT) {
    return <SingleSelectFilterOptions column={column} />;
  } else if (column.type === ColumnFilterType.NUMBER) {
    return <NumberFilterOptions column={column} />;
  } else {
    return null;
  }
}
