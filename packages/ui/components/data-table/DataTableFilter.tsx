"use client";

import type { Column } from "@tanstack/react-table";
import { useState } from "react";

import { classNames } from "@calcom/lib";

import { Badge } from "../badge";
import { Button } from "../button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "../command";
import type { IconName } from "../icon";
import { Icon } from "../icon";
import { Popover, PopoverContent, PopoverTrigger } from "../popover";

interface FilterOption {
  label: string;
  value: string;
  icon?: IconName;
  options?: FilterOption[];
}

interface DataTableFilter<TData, TValue> {
  column?: Column<TData, TValue>;
  title?: string;
  options: FilterOption[];
}

export function DataTableFilter<TData, TValue>({ column, title, options }: DataTableFilter<TData, TValue>) {
  const facets = column?.getFacetedUniqueValues();
  const selectedValues = new Set(column?.getFilterValue() as string[]);
  const [currentOptions, setCurrentOptions] = useState<FilterOption[]>(options);
  const [navigationPath, setNavigationPath] = useState<string[]>([]);

  const flattenOptions = (opts: FilterOption[]): FilterOption[] => {
    return opts.reduce((acc, option) => {
      acc.push(option);
      if (option.options) {
        acc.push(...flattenOptions(option.options));
      }
      return acc;
    }, [] as FilterOption[]);
  };

  const allOptions = flattenOptions(options);

  const handleSelect = (option: FilterOption) => {
    if (option.options) {
      setCurrentOptions(option.options);
      setNavigationPath([...navigationPath, option.label]);
    } else {
      if (selectedValues.has(option.value)) {
        selectedValues.delete(option.value);
      } else {
        selectedValues.add(option.value);
      }
      const filterValues = Array.from(selectedValues);
      column?.setFilterValue(filterValues.length ? filterValues : undefined);
    }
  };

  const handleBack = () => {
    if (navigationPath.length > 0) {
      const newPath = [...navigationPath];
      newPath.pop();
      setNavigationPath(newPath);

      let newOptions = options;
      for (const label of newPath) {
        const found = newOptions.find((o) => o.label === label);
        if (found && found.options) {
          newOptions = found.options;
        }
      }
      setCurrentOptions(newOptions);
    }
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button color="secondary" size="sm" className="border-subtle h-8 rounded-md">
          <Icon name="filter" className="mr-2 h-4 w-4" />
          {title}
          {selectedValues?.size > 0 && (
            <>
              <div className="ml-2 hidden space-x-1 md:flex">
                {selectedValues.size > 2 ? (
                  <Badge color="gray" className="rounded-sm px-1 font-normal">
                    {selectedValues.size}
                  </Badge>
                ) : (
                  allOptions
                    .filter((option) => selectedValues.has(option.value))
                    .map((option) => (
                      <Badge color="gray" key={option.value} className="rounded-sm px-1 font-normal">
                        {option.label}
                      </Badge>
                    ))
                )}
              </div>
            </>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[200px] p-0" align="start">
        <Command>
          <CommandInput placeholder={title} />
          <CommandList>
            <CommandEmpty>No results found.</CommandEmpty>
            {navigationPath.length > 0 && (
              <CommandGroup>
                <CommandItem onSelect={handleBack}>
                  <Icon name="arrow-left" className="mr-2 h-4 w-4" />
                  Back
                </CommandItem>
              </CommandGroup>
            )}
            <CommandGroup>
              {currentOptions.map((option) => {
                const isSelected = selectedValues.has(option.value);
                return (
                  <CommandItem key={option.value} onSelect={() => handleSelect(option)}>
                    {!option.options && (
                      <div
                        className={classNames(
                          "border-subtle mr-2 flex h-4 w-4 items-center justify-center rounded-sm border",
                          isSelected ? "text-emphasis" : "opacity-50 [&_svg]:invisible"
                        )}>
                        <Icon name="check" className={classNames("h-4 w-4")} />
                      </div>
                    )}
                    {option.icon && <Icon name={option.icon} className="text-muted mr-2 h-4 w-4" />}
                    <span>{option.label}</span>
                    {option.options && <Icon name="chevron-right" className="ml-auto h-4 w-4" />}
                    {!option.options && facets?.get(option.value) && (
                      <span className="ml-auto flex h-4 w-4 items-center justify-center font-mono text-xs">
                        {facets.get(option.value)}
                      </span>
                    )}
                  </CommandItem>
                );
              })}
            </CommandGroup>
            {selectedValues.size > 0 && (
              <>
                <CommandSeparator />
                <CommandGroup>
                  <CommandItem
                    onSelect={() => column?.setFilterValue(undefined)}
                    className="justify-center text-center">
                    Clear filters
                  </CommandItem>
                </CommandGroup>
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
