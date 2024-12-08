import { type Table } from "@tanstack/react-table";

import type { FilterableColumn, FilterValue, SelectFilterValue, TextFilterValue } from "../../lib/types";
import type { ActiveFilter, FiltersSearchState, SetFiltersSearchState } from "../../lib/utils";
import { MultiSelectFilterOptions } from "./MultiSelectFilterOptions";
import { TextFilterOptions } from "./TextFilterOptions";

export type FilterOptionsProps<TData> = {
  column: FilterableColumn;
  filter: ActiveFilter;
  state: FiltersSearchState;
  setState: SetFiltersSearchState;
  table: Table<TData>;
};

export function FilterOptions<TData>({ column, filter, state, setState, table }: FilterOptionsProps<TData>) {
  const filterValue = table.getColumn(column.id)?.getFilterValue() as FilterValue | undefined;

  const setMultiSelectFilterValue = (value: SelectFilterValue) => {
    setState({
      activeFilters: state.activeFilters.map((item) => (item.f === filter.f ? { ...item, v: value } : item)),
    });
    table.getColumn(column.id)?.setFilterValue(value);
  };

  const setTextFilterValue = (value: TextFilterValue) => {
    setState({
      activeFilters: state.activeFilters.map((item) => (item.f === filter.f ? { ...item, v: value } : item)),
    });
    table.getColumn(column.id)?.setFilterValue(value);
  };

  const removeFilter = (columnId: string) => {
    setState({ activeFilters: (state.activeFilters || []).filter((filter) => filter.f !== columnId) });
    table.getColumn(columnId)?.setFilterValue(undefined);
  };

  if (column.filterType === "text") {
    return (
      <TextFilterOptions
        column={column}
        filterValue={filterValue as TextFilterValue | undefined}
        setFilterValue={setTextFilterValue}
        removeFilter={removeFilter}
      />
    );
  } else if (column.filterType === "select") {
    return (
      <MultiSelectFilterOptions
        column={column}
        filterValue={filterValue as SelectFilterValue | undefined}
        setFilterValue={setMultiSelectFilterValue}
        removeFilter={removeFilter}
      />
    );
  } else {
    return null;
  }
}
