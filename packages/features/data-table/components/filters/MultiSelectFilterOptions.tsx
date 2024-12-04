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

import type { FilterableColumn } from "../../lib/types";
import { ZSelectFilterValue } from "../../lib/types";
import { useFilterValue, useFiltersState } from "../../lib/utils";

export type MultiSelectFilterOptionsProps = {
  column: Extract<FilterableColumn, { type: "select" }>;
};

export function MultiSelectFilterOptions({ column }: MultiSelectFilterOptionsProps) {
  const { t } = useLocale();
  const filterValue = useFilterValue(column.id, ZSelectFilterValue);
  const { updateFilter, removeFilter } = useFiltersState();

  return (
    <Command>
      <CommandInput placeholder={t("search_options")} />
      <CommandList>
        <CommandEmpty>{t("no_options_found")}</CommandEmpty>
        {Array.from(column.options.keys()).map((option) => {
          if (!option) return null;
          const { label: optionLabel, value: optionValue } =
            typeof option === "string" ? { label: option, value: option } : option;

          return (
            <CommandItem
              key={optionValue}
              onSelect={() => {
                const newFilterValue = filterValue?.includes(optionValue)
                  ? filterValue?.filter((value) => value !== optionValue)
                  : [...(filterValue || []), optionValue];
                updateFilter(column.id, newFilterValue);
              }}>
              <div
                className={classNames(
                  "border-subtle mr-2 flex h-4 w-4 items-center justify-center rounded-sm border",
                  Array.isArray(filterValue) && (filterValue as string[])?.includes(optionValue)
                    ? "bg-primary"
                    : "opacity-50"
                )}>
                {Array.isArray(filterValue) && (filterValue as string[])?.includes(optionValue) && (
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
