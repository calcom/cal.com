import { useState } from "react";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Button } from "@calcom/ui/components/button";
import { Command, CommandList, CommandItem } from "@calcom/ui/components/command";
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
      label: t("booking_time_option"),
      description: t("booking_time_option_description"),
      value: "startTime",
    },
    {
      label: t("created_at_option"),
      description: t("created_at_option_description"),
      value: "createdAt",
    },
  ];

  const selectedOption = options.find((option) => option.value === value) || options[0];

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="icon"
          color="secondary"
          StartIcon="sliders-horizontal"
          role="combobox"
          aria-expanded={open}>
          <span className="sr-only">{selectedOption.label}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-0" align="end">
        <Command>
          <CommandList>
            {options.map((option) => (
              <CommandItem
                key={option.value}
                onSelect={() => {
                  onChange(option.value);
                  setOpen(false);
                }}
                className="flex items-center gap-2 px-4 py-3 rounded-none">
                <div>
                  <div className="font-medium">{option.label}</div>
                  <div className="text-muted-foreground text-sm">{option.description}</div>
                </div>
                {selectedOption.value === option.value && (
                  <Icon name="check" className="text-primary-foreground h-4 w-4" />
                )}
              </CommandItem>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};
