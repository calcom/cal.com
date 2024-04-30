"use client";

import { Check } from "lucide-react";
import { useRouter } from "next/navigation";
import React, { forwardRef, useState } from "react";

import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "~/components/ui/command";
import { cn } from "~/lib/utils";

export const defaultSort = {
  title: "Relevance",
  slug: null,
  sortKey: "RELEVANCE",
  reverse: false,
};

export const sorting = [
  defaultSort,
  {
    title: "Availability",
    slug: "available-desc",
    sortKey: "MOST_AVAILABLE",
    reverse: false,
  }, // asc
];
export type Option = { value: string; label: string };

export interface AutocompleteSearchProps extends React.ComponentPropsWithoutRef<typeof Command> {
  className?: string;
  options: Array<Option>;
  initialSearch?: string;
  placement?: "header";
}
export const AutocompleteSearch = forwardRef<HTMLDivElement, AutocompleteSearchProps>(
  ({ className, placement, options, initialSearch, ...props }, ref) => {
    const initialSeletion = options.find((option) => option.value === initialSearch);
    const [value, setValue] = useState(initialSeletion?.value ?? "");
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState(initialSeletion?.label ?? "");
    const router = useRouter();

    return (
      <div
        className="relative z-10"
        onBlur={(e) => {
          if (e.currentTarget.contains(e.relatedTarget)) return;

          if (value && !query) {
            setQuery(options.find((option) => option.value === value)?.label ?? "");
          }
          setOpen(false);
        }}>
        <Command
          data-open={open}
          className={cn("data-[open=true]:rounded-b-none", placement === "header" && "border", className)}
          ref={ref}
          {...props}>
          <CommandInput
            value={query}
            placeholder="Search an expert..."
            onFocus={() => {
              setOpen(true);
              if (query === options.find((option) => option.value === value)?.label) {
                setQuery("");
              }
            }}
            onValueChange={(value) => setQuery(value)}
            className="h-full justify-center leading-[2.75rem]"
          />

          <CommandList>
            {open && (
              <div
                data-open={open}
                className={cn(
                  "bg-background data-[open=true]:animate-in data-[open=true]:fade-in absolute left-0 right-0 top-full rounded-b-md p-0 shadow !duration-150",
                  placement === "header" && "border-x border-b"
                )}>
                <CommandEmpty>No expert found.</CommandEmpty>
                <CommandGroup>
                  {options.map((option) => (
                    <CommandItem
                      key={option.value}
                      value={option.value}
                      onSelect={(newValue) => {
                        setValue(newValue);
                        setQuery(options.find((option) => option.value === newValue)?.label ?? "");

                        setOpen(false);

                        router.push(`/experts?${new URLSearchParams({ q: newValue }).toString()}`, {
                          scroll: false,
                        });
                      }}>
                      <Check
                        className={cn("mr-2 h-4 w-4", value === option.value ? "opacity-100" : "opacity-0")}
                      />
                      {option.label}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </div>
            )}
          </CommandList>
        </Command>
      </div>
    );
  }
);

AutocompleteSearch.displayName = "AutocompleteSearch";

export default AutocompleteSearch;
