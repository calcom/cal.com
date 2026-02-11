"use client";

import { useMemo } from "react";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import classNames from "@calcom/ui/classNames";
import { buttonClasses } from "@calcom/ui/components/button";
import {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandItem,
  CommandSeparator,
  CommandGroup,
} from "@calcom/ui/components/command";
import { Icon } from "@calcom/ui/components/icon";

import { useDataTable, useFilterValue } from "@calcom/features/data-table/hooks";
import type {
  FacetedValue,
  FilterableColumn as _FilterableColumn,
  FilterValueSchema,
} from "@calcom/features/data-table/lib/types";
import type { FilterType } from "@calcom/types/data-table";

type FilterableColumn = Extract<_FilterableColumn, { type: Extract<FilterType, "ms" | "ss"> }>;

type FilterableSelectColumn<T extends Extract<FilterType, "ms" | "ss">> = Extract<
  FilterableColumn,
  { type: T }
>;

type FilterValue<T extends Extract<FilterType, "ms" | "ss">> = ReturnType<
  typeof useFilterValue<T, FilterValueSchema<T>>
>;

export type BaseSelectFilterOptionsProps<T extends Extract<FilterType, "ms" | "ss">> = {
  column: FilterableSelectColumn<T>;
  filterValueSchema: FilterValueSchema<T>;
  isOptionSelected: (filterValue: FilterValue<T> | undefined, optionValue: string | number) => boolean;
  onOptionSelect: (
    column: FilterableSelectColumn<T>,
    currentFilterValue: FilterValue<T> | undefined,
    optionValue: string | number
  ) => void;
  testIdPrefix: string;
};

type SectionedOptions = {
  [section: string]: FacetedValue[];
};

function getSectionedOptions(options: FacetedValue[]) {
  // First map and normalize the options
  const normalizedOptions = options
    .map((option) => {
      if (!option) return null;
      const {
        label: optionLabel,
        value: optionValue,
        section,
      } = typeof option === "string" ? { label: option, value: option, section: undefined } : option;
      return { label: optionLabel, value: optionValue, section };
    })
    .filter((option): option is NonNullable<typeof option> => option !== null);

  // Group options by section
  const sectionedOptions: SectionedOptions = {};

  let currentSection = "";
  normalizedOptions.forEach((option) => {
    const sectionKey = option.section ?? ""; // Use empty string for unsectioned items
    if (sectionKey && sectionKey !== currentSection) {
      currentSection = sectionKey;
    }
    if (!sectionedOptions[currentSection]) {
      sectionedOptions[currentSection] = [];
    }
    const { section: _, ...optionWithoutSection } = option;
    sectionedOptions[currentSection].push(optionWithoutSection);
  });

  return sectionedOptions;
}

export function BaseSelectFilterOptions<T extends Extract<FilterType, "ms" | "ss">>({
  column,
  filterValueSchema,
  isOptionSelected,
  onOptionSelect,
  testIdPrefix,
}: BaseSelectFilterOptionsProps<T>) {
  const { t } = useLocale();

  const filterValue = useFilterValue(column.id, filterValueSchema);
  const { removeFilter } = useDataTable();

  const options = useMemo(() => {
    const sectionedOptions = getSectionedOptions(column.options);

    // Sort options within each section based on selection status
    Object.keys(sectionedOptions).forEach((section) => {
      sectionedOptions[section] = [
        ...sectionedOptions[section].filter((option) => isOptionSelected(filterValue, option.value)),
        ...sectionedOptions[section].filter((option) => !isOptionSelected(filterValue, option.value)),
      ];
    });

    // Flatten the sections back into an array with section information
    return Object.keys(sectionedOptions).flatMap((section) =>
      sectionedOptions[section].map((option, index) => ({
        section: section === "" || index > 0 ? undefined : section,
        ...option,
      }))
    );
  }, [column.options, filterValue]);

  return (
    <Command data-testid={`${testIdPrefix}-${column.id}`}>
      <CommandInput placeholder={t("search")} data-testid={`select-filter-options-search-${column.id}`} />
      <CommandList>
        <CommandEmpty>{t("no_options_available")}</CommandEmpty>
        {options.map((option, index) => {
          const { label: optionLabel, value: optionValue, section } = option;

          return (
            <>
              {section && index !== 0 && <hr className="border-subtle my-1" />}
              {section && (
                <div className="text-subtle px-4 py-2 text-xs font-medium uppercase leading-none">
                  {section}
                </div>
              )}
              <CommandItem
                key={optionValue}
                onSelect={() => onOptionSelect(column, filterValue, optionValue)}>
                <div
                  className={classNames(
                    "border-subtle mr-2 flex h-4 w-4 items-center justify-center rounded-sm",
                    isOptionSelected(filterValue, optionValue) ? "bg-primary-default" : "border opacity-50"
                  )}>
                  {isOptionSelected(filterValue, optionValue) && (
                    <Icon name="check" className="text-primary-foreground h-4 w-4" />
                  )}
                </div>
                {optionLabel}
              </CommandItem>
            </>
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
