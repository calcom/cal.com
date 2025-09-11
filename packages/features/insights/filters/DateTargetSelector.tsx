import { useState } from "react";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Button } from "@calcom/ui/components/button";
import { Command, CommandInput, CommandList, CommandEmpty, CommandItem } from "@calcom/ui/components/command";
import { Icon } from "@calcom/ui/components/icon";
import { Popover, PopoverTrigger, PopoverContent } from "@calcom/ui/components/popover";

export type DateTarget = "startTime" | "createdAt";

interface DateTargetOption {
  label: string;
  description: string;
  value: DateTarget;
}

interface DateTargetSelectorProps {
  value: DateTarget;
  onChange: (value: DateTarget) => void;
}

export const DateTargetSelector = ({ value, onChange }: DateTargetSelectorProps) => {
  const { t } = useLocale();
  const [open, setOpen] = useState(false);

  const options: DateTargetOption[] = [
    {
      label: t("start_time"),
      description: t("start_time_description"),
      value: "startTime",
    },
    {
      label: t("created_at"),
      description: t("created_at_description"),
      value: "createdAt",
    },
  ];

  const selectedOption = options.find((option) => option.value === value) || options[0];

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="button"
          color="secondary"
          role="combobox"
          aria-expanded={open}
          className="w-32 justify-between text-sm"
          size="sm">
          {selectedOption.label}
          <Icon name="chevron-down" className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-0" align="start">
        <Command>
          <CommandInput placeholder={t("search")} />
          <CommandList>
            <CommandEmpty>{t("no_options_found")}</CommandEmpty>
            {options.map((option) => (
              <CommandItem
                key={option.value}
                onSelect={() => {
                  onChange(option.value);
                  setOpen(false);
                }}
                className="flex flex-col items-start px-4 py-3">
                <div className="font-medium">{option.label}</div>
                <div className="text-muted-foreground text-sm">{option.description}</div>
              </CommandItem>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};
