"use client";

import { type Table } from "@tanstack/react-table";
import startCase from "lodash/startCase";
import { forwardRef, useState } from "react";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Button } from "@calcom/ui/components/button";
import { Command, CommandInput, CommandList, CommandEmpty, CommandItem } from "@calcom/ui/components/command";
import { Icon } from "@calcom/ui/components/icon";
import { Popover, PopoverTrigger, PopoverContent } from "@calcom/ui/components/popover";
import { Tooltip } from "@calcom/ui/components/tooltip";

import { useDataTable, useFilterableColumns } from "../../hooks";

export interface AddFilterButtonProps<TData> {
  table: Table<TData>;
  variant?: "base" | "sm";
}

function AddFilterButtonComponent<TData>(
  { table, variant = "base" }: AddFilterButtonProps<TData>,
  ref: React.Ref<HTMLButtonElement>
) {
  const { t } = useLocale();
  const { activeFilters, addFilter, filterToOpen } = useDataTable();
  const [open, setOpen] = useState(false);

  const filterableColumns = useFilterableColumns(table);
  const availableColumns = filterableColumns.filter(
    (column) => !activeFilters?.some((filter) => filter.f === column.id)
  );

  if (variant === "sm" && availableColumns.length === 0) {
    return null;
  }

  return (
    <div className="flex items-center space-x-2">
      <Popover open={open} onOpenChange={setOpen}>
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
              {availableColumns.map((column) => {
                const showHiddenIndicator =
                  !table.getColumn(column.id)?.getIsVisible() &&
                  table.initialState.columnVisibility?.[column.id] !== false;

                return (
                  <CommandItem
                    key={column.id}
                    onSelect={() => {
                      if (filterToOpen) filterToOpen.current = column.id;
                      addFilter(column.id);
                      setOpen(false);
                    }}
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
