import type { Filter, FiltersSearchState, SetFiltersSearchState } from "../types";
import type { FilterableColumn, SelectFilterValue, TextFilterValue } from "../types";
import type { Table } from "../types";
import { MultiSelectFilterOptions } from "./MultiSelectFilterOptions";
import { TextFilterOptions } from "./TextFilterOptions";

export type FilterOptionsProps<TData> = {
  column: FilterableColumn;
  filter: Filter;
  state: FiltersSearchState;
  setState: SetFiltersSearchState;
  table: Table<TData>;
};

export function FilterOptions<TData>({ column, state, setState, table }: FilterOptionsProps<TData>) {
  const filterValue = table.getColumn(column.id)?.getFilterValue();

  const setMultiSelectFilterValue = (value: SelectFilterValue) => {
    setState({
      activeFilters: state.activeFilters.map((item) => (item.f === filter.f ? { ...item, v: value } : item)),
    });
    table.getColumn(column.id)?.setFilterValue(value.length ? value : undefined);
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
        filterValue={filterValue}
        setFilterValue={setTextFilterValue}
        removeFilter={removeFilter}
      />
    );
  } else if (column.filterType === "select") {
    return (
      <MultiSelectFilterOptions
        column={column}
        filterValue={filterValue}
        setFilterValue={setMultiSelectFilterValue}
        removeFilter={removeFilter}
      />
    );
  } else {
    return null;
  }
}
