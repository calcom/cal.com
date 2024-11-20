"use client";

import { type Table } from "@tanstack/react-table";
import { forwardRef, useState, useMemo } from "react";

import { classNames } from "@calcom/lib";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import type { ButtonProps } from "@calcom/ui";
import {
  Button,
  buttonClasses,
  Popover,
  PopoverTrigger,
  PopoverContent,
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandSeparator,
  Icon,
} from "@calcom/ui";

import type { FilterableColumn } from "../../lib/types";
import { useFiltersSearchState } from "../../lib/utils";
import { FilterOptions } from "./FilterOptions";

interface ColumnVisiblityProps<TData> {
  table: Table<TData>;
}

function ColumnVisibilityButtonComponent<TData>(
  {
    children,
    color = "secondary",
    EndIcon = "sliders-vertical",
    table,
    ...rest
  }: ColumnVisiblityProps<TData> & ButtonProps,
  ref: React.Ref<HTMLButtonElement>
) {
  const { t } = useLocale();
  const allColumns = table.getAllLeafColumns();
  const [open, setOpen] = useState(false);
  const [visibleColumns, setVisibleColumns] = useState(
    () => new Set(allColumns.filter((col) => col.getIsVisible()).map((col) => col.id))
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button ref={ref} color={color} EndIcon={EndIcon} {...rest}>
          {children ? children : t("View")}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[200px] p-0" align="start">
        <Command>
          <CommandInput placeholder={t("search")} />
          <CommandList>
            <CommandEmpty>{t("no_columns_found")}</CommandEmpty>
            <CommandGroup heading={t("toggle_columns")}>
              {allColumns.map((column) => {
                const canHide = column.getCanHide();
                if (!column.columnDef.header || typeof column.columnDef.header !== "string" || !canHide)
                  return null;
                const isVisible = visibleColumns.has(column.id);
                return (
                  <CommandItem
                    key={column.id}
                    onSelect={() => {
                      column.toggleVisibility(!isVisible);
                      setVisibleColumns((prev) => {
                        const next = new Set(prev);
                        if (isVisible) {
                          next.delete(column.id);
                        } else {
                          next.add(column.id);
                        }
                        return next;
                      });
                    }}>
                    <div
                      className={classNames(
                        "border-subtle mr-2 flex h-4 w-4 items-center justify-center rounded-sm border",
                        isVisible ? "text-emphasis" : "opacity-50 [&_svg]:invisible"
                      )}>
                      <Icon name="check" className={classNames("h-4 w-4", !isVisible && "invisible")} />
                    </div>
                    {column.columnDef.header}
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
          <CommandSeparator />
          <CommandGroup>
            <CommandItem
              onSelect={() => {
                allColumns.forEach((column) => column.toggleVisibility(true));
                setVisibleColumns(new Set(allColumns.map((col) => col.id)));
              }}
              className={classNames(
                "w-full justify-center text-center",
                buttonClasses({ color: "secondary" })
              )}>
              {t("show_all_columns")}
            </CommandItem>
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

const ColumnVisibilityButton = forwardRef(ColumnVisibilityButtonComponent) as <TData>(
  props: ColumnVisiblityProps<TData> & ButtonProps & { ref?: React.Ref<HTMLButtonElement> }
) => ReturnType<typeof ColumnVisibilityButtonComponent>;

// Filters
interface FilterButtonProps<TData> {
  table: Table<TData>;
  omit?: string[];
}

function FilterButtonComponent<TData>(
  { table, omit }: FilterButtonProps<TData>,
  ref: React.Ref<HTMLButtonElement>
) {
  const { t } = useLocale();
  const [_state, _setState] = useFiltersSearchState();

  const activeFilters = _state.activeFilters;
  const columns = table
    .getAllColumns()
    .filter((column) => column.getCanFilter())
    .filter((column) => !omit?.includes(column.id));

  const filterableColumns = useMemo(() => {
    return columns.map((column) => ({
      id: column.id,
      title: typeof column.columnDef.header === "string" ? column.columnDef.header : column.id,
      options: column.getFacetedUniqueValues(),
    }));
  }, [columns]);

  const handleAddFilter = (columnId: string) => {
    if (!activeFilters?.some((filter) => filter.f === columnId)) {
      _setState({ activeFilters: [...activeFilters, { f: columnId, v: [] }] });
    }
  };

  return (
    <div className="flex items-center space-x-2">
      <Popover>
        <PopoverTrigger asChild>
          <Button ref={ref} color="secondary" className="border-dashed">
            <Icon name="filter" className="mr-2 h-4 w-4" />
            {t("add_filter")}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[200px] p-0" align="start">
          <Command>
            <CommandInput placeholder={t("search_columns")} />
            <CommandList>
              <CommandEmpty>{t("no_columns_found")}</CommandEmpty>
              {filterableColumns.map((column) => {
                if (activeFilters?.some((filter) => filter.f === column.id)) return null;
                return (
                  <CommandItem key={column.id} onSelect={() => handleAddFilter(column.id)}>
                    {column.title}
                  </CommandItem>
                );
              })}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}

const FilterButton = forwardRef(FilterButtonComponent) as <TData>(
  props: FilterButtonProps<TData> & { ref?: React.Ref<HTMLButtonElement>; omit?: string[] }
) => ReturnType<typeof FilterButtonComponent>;

// Add the new ActiveFilters component
interface ActiveFiltersProps<TData> {
  table: Table<TData>;
}

function ActiveFilters<TData>({ table }: ActiveFiltersProps<TData>) {
  const [_state, _setState] = useFiltersSearchState();

  const columns = table.getAllColumns().filter((column) => column.getCanFilter());

  const filterableColumns = useMemo<FilterableColumn[]>(() => {
    return columns.map((column) => {
      return {
        id: column.id,
        title: typeof column.columnDef.header === "string" ? column.columnDef.header : column.id,
        filterType: column.columnDef.meta?.filterType || "select",
        options: column.getFacetedUniqueValues(),
      };
    });
  }, [columns]);

  return (
    <>
      {(_state.activeFilters || []).map((filter) => {
        const column = filterableColumns.find((col) => col.id === filter.f);
        if (!column) return null;
        return (
          <Popover key={column.id}>
            <PopoverTrigger asChild>
              <Button color="secondary">
                {column.title}
                <Icon name="chevron-down" className="ml-2 h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="p-0" align="start">
              <FilterOptions
                column={column}
                filter={filter}
                state={_state}
                setState={_setState}
                table={table}
              />
            </PopoverContent>
          </Popover>
        );
      })}
    </>
  );
}

// Update the export to include ActiveFilters
export const DataTableFilters = { ColumnVisibilityButton, FilterButton, ActiveFilters };
