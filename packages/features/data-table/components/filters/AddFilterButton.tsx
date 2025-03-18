"use client";

import { type Table } from "@tanstack/react-table";
// eslint-disable-next-line no-restricted-imports
import startCase from "lodash/startCase";
import { forwardRef } from "react";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import {
  Button,
  Popover,
  PopoverTrigger,
  PopoverContent,
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandItem,
  Icon,
  Tooltip,
} from "@calcom/ui";

import { useDataTable, useFilterableColumns } from "../../hooks";

export interface AddFilterButtonProps<TData> {
  table: Table<TData>;
  variant?: "base" | "sm";
  hideWhenFilterApplied?: boolean;
  showWhenFilterApplied?: boolean;
}

function AddFilterButtonComponent<TData>(
  {
    table,
    variant = "base",
    hideWhenFilterApplied = false,
    showWhenFilterApplied = false,
  }: AddFilterButtonProps<TData>,
  ref: React.Ref<HTMLButtonElement>
) {
  const { t } = useLocale();
  const { activeFilters, addFilter } = useDataTable();

  const filterableColumns = useFilterableColumns(table);

  if (hideWhenFilterApplied && activeFilters?.length > 0) {
    return null;
  }

  if (showWhenFilterApplied && activeFilters?.length === 0) {
    return null;
  }

  return (
    <div className="flex items-center space-x-2">
      <Popover>
        {variant === "base" && (
          <PopoverTrigger asChild>
            <Button
              ref={ref}
              color="secondary"
              data-testid="add-filter-button"
              StartIcon="sliders-horizontal"
              className="h-full">
              {t("filter")}
            </Button>
          </PopoverTrigger>
        )}
        {variant === "sm" && (
          <Tooltip content={t("add_filter")}>
            <PopoverTrigger asChild>
              <Button ref={ref} color="secondary" data-testid="add-filter-button" className="h-full">
                <span className="sr-only">{t("filter")}</span>
                <Icon name="plus" />
              </Button>
            </PopoverTrigger>
          </Tooltip>
        )}
        <PopoverContent className="w-[200px] p-0" align="start">
          <Command>
            <CommandInput placeholder={t("search")} />
            <CommandList>
              <CommandEmpty>{t("no_columns_found")}</CommandEmpty>
              {filterableColumns.map((column) => {
                const showHiddenIndicator =
                  !table.getColumn(column.id)?.getIsVisible() &&
                  table.initialState.columnVisibility?.[column.id] !== false;

                if (activeFilters?.some((filter) => filter.f === column.id)) return null;
                return (
                  <CommandItem
                    key={column.id}
                    onSelect={() => addFilter(column.id)}
                    className="flex items-center justify-between px-4 py-2"
                    data-testid={`add-filter-item-${column.id}`}>
                    <span>{startCase(column.title)}</span>
                    {showHiddenIndicator && <Icon name="eye-off" className="h-4 w-4 opacity-50" />}
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

export const AddFilterButton = forwardRef(AddFilterButtonComponent) as <TData>(
  props: AddFilterButtonProps<TData> & { ref?: React.Ref<HTMLButtonElement> }
) => ReturnType<typeof AddFilterButtonComponent>;
