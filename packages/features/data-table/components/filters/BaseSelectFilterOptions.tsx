"use client";

import { useMemo } from "react";

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
import type {
  ColumnFilterType,
  FacetedValue,
  FilterableColumn,
  MultiSelectFilterValue,
  SingleSelectFilterValue,
} from "../../lib/types";
import type { ZMultiSelectFilterValue, ZSingleSelectFilterValue } from "../../lib/types";

type FilterableSelectColumn = Extract<
  FilterableColumn,
  { type: ColumnFilterType.MULTI_SELECT | ColumnFilterType.SINGLE_SELECT }
>;
type SelectFilterValue = MultiSelectFilterValue | SingleSelectFilterValue;

export type BaseSelectFilterOptionsProps = {
  column: FilterableSelectColumn;
  filterSchema: typeof ZMultiSelectFilterValue | typeof ZSingleSelectFilterValue;
  isOptionSelected: (filterValue: SelectFilterValue | null, optionValue: string) => boolean;
  onOptionSelect: (
    column: FilterableSelectColumn,
    currentFilterValue: SelectFilterValue | null,
    optionValue: string
  ) => void;
  testIdPrefix: string;
};

type SectionedOptions = {
  [section: string]: FacetedValue[];
};

function getSectionedOptions(options: FilterableSelectColumn["options"]) {
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

export function BaseSelectFilterOptions({
  column,
  filterSchema,
  isOptionSelected,
  onOptionSelect,
  testIdPrefix,
}: BaseSelectFilterOptionsProps) {
  const { t } = useLocale();
  const filterValue = useFilterValue(column.id, filterSchema);
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
      <CommandInput placeholder={t("search")} />
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
                    "border-subtle mr-2 flex h-4 w-4 items-center justify-center rounded-sm border",
                    isOptionSelected(filterValue, optionValue) ? "bg-primary" : "opacity-50"
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
