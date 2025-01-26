"use client";

import { classNames } from "@calcom/lib";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandItem,
  CommandSeparator,
  CommandGroup,
  buttonClasses,
  Icon,
} from "@calcom/ui";

import { useDataTable, useFilterValue } from "../../hooks";
import type { FilterableColumn } from "../../lib/types";
import { ZMultiSelectFilterValue } from "../../lib/types";

export type MultiSelectFilterOptionsProps = {
  column: Extract<FilterableColumn, { type: "multi_select" }>;
};

export function MultiSelectFilterOptions({ column }: MultiSelectFilterOptionsProps) {
  const { t } = useLocale();
  const filterValue = useFilterValue(column.id, ZMultiSelectFilterValue);
  const { updateFilter, removeFilter } = useDataTable();

  return (
    <Command>
      <CommandInput placeholder={t("search")} />
      <CommandList>
        <CommandEmpty>{t("no_options_found")}</CommandEmpty>
        {column.options.map((option) => {
          if (!option) return null;
          const { label: optionLabel, value: optionValue } =
            typeof option === "string" ? { label: option, value: option } : option;

          return (
            <CommandItem
              key={optionValue}
              onSelect={() => {
                const newFilterValue = filterValue?.data.includes(optionValue)
                  ? filterValue?.data.filter((value) => value !== optionValue)
                  : [...(filterValue?.data || []), optionValue];
                updateFilter(column.id, { type: "multi_select", data: newFilterValue });
              }}>
              <div
                className={classNames(
                  "border-subtle mr-2 flex h-4 w-4 items-center justify-center rounded-sm border",
                  filterValue?.data.includes(optionValue) ? "bg-primary" : "opacity-50"
                )}>
                {filterValue?.data.includes(optionValue) && (
                  <Icon name="check" className="text-primary-foreground h-4 w-4" />
                )}
              </div>
              {optionLabel}
            </CommandItem>
          );
        })}
      </CommandList>
      <CommandSeparator />
      <CommandGroup>
        <CommandItem
          onSelect={() => {
            removeFilter(column.id);
          }}
          className={classNames("w-full justify-center text-center", buttonClasses({ color: "secondary" }))}>
          {t("clear")}
        </CommandItem>
      </CommandGroup>
    </Command>
  );
}
