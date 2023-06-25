import type { Column } from "@tanstack/react-table";
import type { LucideIcon } from "lucide-react";
import { Check, Filter } from "lucide-react";

import classNames from "@calcom/lib/classNames";

import { Badge } from "../badge";
import { Button } from "../button";
import {
  Dropdown,
  DropdownItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../form";

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
    <Dropdown>
      <DropdownMenuTrigger asChild>
        <Button color="secondary" size="sm" className="h-8 rounded-md">
          <Filter className="mr-2 h-4 w-4" />
          {title}
          {selectedValues?.size > 0 && (
            <>
              <div className="ml-1 hidden space-x-1 md:flex">
                {selectedValues.size > 2 ? (
                  <Badge color="gray">{selectedValues.size} selected</Badge>
                ) : (
                  options
                    .filter((option) => selectedValues.has(option.value))
                    .map((option) => (
                      <Badge color="gray" key={option.value}>
                        {option.label}
                      </Badge>
                    ))
                )}
              </div>
            </>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        {/* <CommandInput placeholder={title} /> */}
        {options.map((option) => {
          const isSelected = selectedValues.has(option.value);
          return (
            <DropdownMenuItem
              checked={isSelected}
              key={option.value}
              onSelect={() => {
                if (isSelected) {
                  selectedValues.delete(option.value);
                } else {
                  selectedValues.add(option.value);
                }
                console.log(option.value);

                const filterValues = Array.from(selectedValues);
                column?.setFilterValue(filterValues.length ? filterValues : undefined);
              }}>
              <DropdownItem className="w-full">
                <div
                  className={classNames(
                    "border-primary mr-2 flex h-4 w-4 items-center justify-center rounded-sm border",
                    isSelected ? "bg-primary text-primary-foreground" : "opacity-50 [&_svg]:invisible"
                  )}>
                  <Check className={classNames("h-4 w-4")} />
                </div>
                {option.icon && <option.icon className="text-muted-foreground mr-2 h-4 w-4" />}
                <span>{option.label}</span>
                {facets?.get(option.value) && (
                  <span className="ml-auto flex h-4 w-4 items-center justify-center font-mono text-xs">
                    {facets.get(option.value)}
                  </span>
                )}
              </DropdownItem>
            </DropdownMenuItem>
          );
        })}
        {selectedValues.size > 0 && (
          <>
            <DropdownMenuSeparator />
            <div>
              <DropdownMenuItem
                onSelect={() => column?.setFilterValue(undefined)}
                className="justify-center text-center">
                Clear filters
              </DropdownMenuItem>
            </div>
          </>
        )}
      </DropdownMenuContent>
    </Dropdown>
  );
}
