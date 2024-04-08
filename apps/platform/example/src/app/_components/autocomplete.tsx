"use client";
import { useState } from "react";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "~/components/ui/command";

import { Check } from "lucide-react";
import { cn } from "~/lib/utils";
import { useRouter } from "next/navigation";
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
export const AutocompleteSearch = (props: { options: Array<Option>; initialSearch?: string }) => {
  const initialSeletion = props.options.find((option) => option.value === props.initialSearch);
  const [value, setValue] = useState(initialSeletion?.value || "");
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(initialSeletion?.label || "");
  const router = useRouter();

  return (
    <div
      className="relative z-10"
      onBlur={(e) => {
        if (e.currentTarget.contains(e.relatedTarget)) return;

        if (value && !query) {
          setQuery(
            props.options.find((option) => option.value === value)?.label || "",
          );
        }
        setOpen(false);
      }}
    >
      <Command data-open={open} className={"data-[open=true]:rounded-b-none"}>
        <CommandInput
          value={query}
          placeholder="Search an expert..."
          onFocus={() => {
            setOpen(true);
            if (
              query ===
              props.options.find((option) => option.value === value)?.label
            ) {
              setQuery("");
            }
          }}
          onValueChange={(value) => setQuery(value)}
          className="leading-[2.75rem]"
        />

        <CommandList>
          {open && (
            <div
              data-open={open}
              className="absolute left-0 right-0 top-full rounded-b-md bg-background p-0 shadow !duration-150 data-[open=true]:animate-in data-[open=true]:fade-in"
            >
              <CommandEmpty>No expert found.</CommandEmpty>
              <CommandGroup>
                {props.options.map((option) => (
                  <CommandItem
                    key={option.value}
                    value={option.value}
                    onFocus={() => console.log("focus")}
                    onSelect={(newValue) => {
                      setValue(newValue);
                      setQuery(
                        props.options.find(
                          (option) => option.value === newValue,
                        )?.label || "",
                      );

                      setOpen(false);

                      router.push(
                        `/experts?${new URLSearchParams({ q: newValue })}`,
                        {scroll: false}
                      );
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value === option.value ? "opacity-100" : "opacity-0",
                      )}
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
};
