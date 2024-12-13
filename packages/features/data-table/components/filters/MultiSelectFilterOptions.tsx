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

import type { FilterableColumn, SelectFilterValue } from "../../lib/types";

export type MultiSelectFilterOptionsProps = {
  column: FilterableColumn;
  filterValue?: SelectFilterValue;
  setFilterValue: (value: SelectFilterValue) => void;
  removeFilter: (columnId: string) => void;
};

export function MultiSelectFilterOptions({
  column,
  filterValue,
  setFilterValue,
  removeFilter,
}: MultiSelectFilterOptionsProps) {
  const { t } = useLocale();

  return (
    <Command>
      <CommandInput placeholder={t("search_options")} />
      <CommandList>
        <CommandEmpty>{t("no_options_found")}</CommandEmpty>
        {Array.from(column.options.keys()).map((option) => {
          if (!option) return null;
          return (
            <CommandItem
              key={option}
              onSelect={() => {
                const newFilterValue = filterValue?.includes(option)
                  ? filterValue?.filter((value) => value !== option)
                  : [...(filterValue || []), option];
                setFilterValue(newFilterValue);
              }}>
              <div
                className={classNames(
                  "border-subtle mr-2 flex h-4 w-4 items-center justify-center rounded-sm border",
                  Array.isArray(filterValue) && (filterValue as string[])?.includes(option)
                    ? "bg-primary"
                    : "opacity-50"
                )}>
                {Array.isArray(filterValue) && (filterValue as string[])?.includes(option) && (
                  <Icon name="check" className="text-primary-foreground h-4 w-4" />
                )}
              </div>
              {option}
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
