"use client";

import { type Table } from "@tanstack/react-table";
// eslint-disable-next-line no-restricted-imports
import startCase from "lodash/startCase";
import { forwardRef, useCallback } from "react";

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
} from "@calcom/ui";

import { useDataTable, useFilterableColumns } from "../../hooks";

export interface AddFilterButtonProps<TData> {
  table: Table<TData>;
}

function AddFilterButtonComponent<TData>(
  { table }: AddFilterButtonProps<TData>,
  ref: React.Ref<HTMLButtonElement>
) {
  const { t } = useLocale();
  const { activeFilters, setActiveFilters } = useDataTable();

  const filterableColumns = useFilterableColumns(table);

  const handleAddFilter = useCallback(
    (columnId: string) => {
      if (!activeFilters?.some((filter) => filter.f === columnId)) {
        setActiveFilters([...activeFilters, { f: columnId, v: undefined }]);
      }
    },
    [activeFilters, setActiveFilters]
  );

  return (
    <div className="flex items-center space-x-2">
      <Popover>
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
        <PopoverContent className="w-[200px] p-0" align="start">
          <Command>
            <CommandInput placeholder={t("search")} />
            <CommandList>
              <CommandEmpty>{t("no_columns_found")}</CommandEmpty>
              {filterableColumns.map((column) => {
                const isVisible = table.getColumn(column.id)?.getIsVisible();
                if (activeFilters?.some((filter) => filter.f === column.id)) return null;
                return (
                  <CommandItem
                    key={column.id}
                    onSelect={() => handleAddFilter(column.id)}
                    className="flex items-center justify-between px-4 py-2"
                    data-testid={`add-filter-item-${column.id}`}>
                    <span>{startCase(column.title)}</span>
                    {!isVisible && <Icon name="eye-off" className="h-4 w-4 opacity-50" />}
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
