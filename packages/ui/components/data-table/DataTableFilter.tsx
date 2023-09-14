import type { Column } from "@tanstack/react-table";
import type { LucideIcon } from "lucide-react";
import { Check, Filter } from "lucide-react";

import { classNames } from "@calcom/lib";

import { Badge } from "../badge";
import { Button } from "../button";
import {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandSeparator,
} from "../command";
import { Popover, PopoverTrigger, PopoverContent } from "../popover";

interface DataTableFilter<TData, TValue> {
  column?: Column<TData, TValue>;
  title?: string;
  options: {
    label: string;
    value: string;
    icon?: LucideIcon;
  }[];
}
export function DataTableFilter<TData, TValue>({ column, title, options }: DataTableFilter<TData, TValue>) {
  const facets = column?.getFacetedUniqueValues();
  const selectedValues = new Set(column?.getFilterValue() as string[]);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button color="secondary" size="sm" className="border-subtle h-8 rounded-md">
          <Filter className="mr-2 h-4 w-4" />
          {title}
          {selectedValues?.size > 0 && (
            <>
              <div className="ml-2 hidden space-x-1 md:flex">
                {selectedValues.size > 2 ? (
                  <Badge color="gray" className="rounded-sm px-1 font-normal">
                    {selectedValues.size}
                  </Badge>
                ) : (
                  options
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
            <CommandGroup>
              {options.map((option) => {
                // TODO: It would be nice to pull these from data instead of options
                const isSelected = selectedValues.has(option.value);
                return (
                  <CommandItem
                    key={option.value}
                    onSelect={() => {
                      if (isSelected) {
                        selectedValues.delete(option.value);
                      } else {
                        selectedValues.add(option.value);
                      }
                      const filterValues = Array.from(selectedValues);
                      column?.setFilterValue(filterValues.length ? filterValues : undefined);
                    }}>
                    <div
                      className={classNames(
                        "border-subtle mr-2 flex h-4 w-4 items-center justify-center rounded-sm border",
                        isSelected ? "text-emphasis" : "opacity-50 [&_svg]:invisible"
                      )}>
                      <Check className={classNames("h-4 w-4")} />
                    </div>
                    {option.icon && <option.icon className="text-muted mr-2 h-4 w-4" />}
                    <span>{option.label}</span>
                    {facets?.get(option.value) && (
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
