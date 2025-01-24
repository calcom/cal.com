"use client";

import type { FilterableColumn } from "../../lib/types";
import { DateRangeFilter } from "./DateRangeFilter";
import { MultiSelectFilterOptions } from "./MultiSelectFilterOptions";
import { NumberFilterOptions } from "./NumberFilterOptions";
import { SingleSelectFilterOptions } from "./SingleSelectFilterOptions";
import { TextFilterOptions } from "./TextFilterOptions";

export type FilterOptionsProps = {
  column: FilterableColumn;
};

export function FilterOptions({ column }: FilterOptionsProps) {
  if (column.type === "text") {
    return <TextFilterOptions column={column} />;
  } else if (column.type === "multi_select") {
    return <MultiSelectFilterOptions column={column} />;
  } else if (column.type === "single_select") {
    return <SingleSelectFilterOptions column={column} />;
  } else if (column.type === "number") {
    return <NumberFilterOptions column={column} />;
  } else if (column.type === "date_range") {
    return <DateRangeFilter column={column} />;
  } else {
    return null;
  }
}
