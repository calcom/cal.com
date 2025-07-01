import classNames from "@calcom/ui/classNames";

import { Badge } from "../badge/Badge";
import { Button } from "../button/Button";
import {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandSeparator,
} from "../command/Command";
import type { IconName } from "../icon/Icon";
import { Icon } from "../icon/Icon";
import { Popover, PopoverTrigger, PopoverContent } from "../popover/Popover";

export interface FilterOption {
  value: string | number;
  label: string;
  icon?: React.ReactNode;
}

interface FilterSelectProps {
  title: string;
  options: FilterOption[];
  selectedValue?: string | number | null;
  onChange: (value: string | number | null) => void;
  buttonIcon?: IconName;
  placeholder?: string;
  emptyText?: string;
  testId?: string;
}

export function FilterSelect({
  title,
  options,
  selectedValue,
  onChange,
  buttonIcon,
  placeholder,
  emptyText = "No results",
  testId,
}: FilterSelectProps) {
  const selectedOption = options.find((option) => option.value === selectedValue);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button color="secondary" data-testid={`${testId}-button`} StartIcon={buttonIcon}>
          {title}
          {selectedValue && (
            <div className="ml-2 hidden space-x-1 md:flex">
              <Badge color="gray" className="rounded-sm px-1 font-normal">
                {selectedOption?.label}
              </Badge>
            </div>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[200px] p-0" align="start">
        <Command>
          <CommandInput placeholder={placeholder ?? title} />
          <CommandList>
            <CommandEmpty>{emptyText}</CommandEmpty>
            <CommandGroup data-testId={`${testId}-group`}>
              {options.map((option, index) => {
                const isSelected = selectedValue === option.value;
                return (
                  <CommandItem
                    key={option.value}
                    onSelect={() => {
                      onChange(isSelected ? null : option.value);
                    }}
                    data-testId={`${testId}-group-option-${index}`}>
                    <div
                      className={classNames(
                        "border-subtle mr-2 flex h-4 w-4 items-center justify-center rounded-sm border",
                        isSelected ? "text-emphasis" : "opacity-50 [&_svg]:invisible"
                      )}>
                      <Icon name="check" className="h-4 w-4" />
                    </div>
                    {option.icon}
                    <span>{option.label}</span>
                  </CommandItem>
                );
              })}
            </CommandGroup>
            {selectedValue && (
              <>
                <CommandSeparator />
                <CommandGroup>
                  <CommandItem onSelect={() => onChange(null)} className="justify-center text-center">
                    Clear filter
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
