"use client";
import {
  Command,
  CommandGroup,
  CommandEmpty,
  CommandItem,
  CommandList,
  CommandInput,
} from "~/components/ui/command";
import { useState, useEffect } from "react";

import { Check } from "lucide-react";
import { cn } from "~/lib/utils";

export type Option = { value: string; label: string };
export const AutocompleteSearch = (props: { options: Array<Option> }) => {
  const [value, setValue] = useState("");
  const [open, setOpen] = useState(false);
  useEffect(() => {
    console.log("value: ", value);
  }, [value]);
  return (
    <Command value={value} onValueChange={setValue}>
      <CommandInput placeholder="Search framework..." />
      <CommandList>
        <CommandEmpty>No framework found.</CommandEmpty>
        <CommandGroup>
          {props.options.map((option) => (
            <CommandItem
              key={option.value}
              value={option.value}
              onSelect={(currentValue) => {
                setValue(() => (currentValue === value ? "" : currentValue));
                setOpen(() => false);
              }}
              onPointerMove={() => {
                console.log("pointer move");
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
      </CommandList>
    </Command>
  );
};
// FROM shadcn to debug why it's disabled
// Remove the below at some point
import * as React from "react";
import { ChevronsUpDown } from "lucide-react";

import { Button } from "~/components/ui/button";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/components/ui/popover";

const frameworks = [
  {
    value: "next.js",
    label: "Next.js",
  },
  {
    value: "sveltekit",
    label: "SvelteKit",
  },
  {
    value: "nuxt.js",
    label: "Nuxt.js",
  },
  {
    value: "remix",
    label: "Remix",
  },
  {
    value: "astro",
    label: "Astro",
  },
];

export function ComboboxDemo() {
  const [open, setOpen] = React.useState(false);
  const [value, setValue] = React.useState("");

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-[200px] justify-between"
        >
          {value
            ? frameworks.find((framework) => framework.value === value)?.label
            : "Select framework..."}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[200px] p-0">
        <Command>
          <CommandInput placeholder="Search framework..." />
          <CommandEmpty>No framework found.</CommandEmpty>
          <CommandGroup>
            {frameworks.map((framework) => (
              <CommandItem
                key={framework.value}
                value={framework.value}
                onSelect={(currentValue) => {
                  setValue(currentValue === value ? "" : currentValue);
                  setOpen(false);
                }}
              >
                <Check
                  className={cn(
                    "mr-2 h-4 w-4",
                    value === framework.value ? "opacity-100" : "opacity-0",
                  )}
                />
                {framework.label}
              </CommandItem>
            ))}
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
