import { Users, Check } from "lucide-react";
import { useState } from "react";

import classNames from "@calcom/lib/classNames";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc";
import {
  Command,
  CommandInput,
  CommandList,
  CommandItem,
  CommandEmpty,
  CommandGroup,
  Button,
  Popover,
  PopoverTrigger,
  PopoverContent,
  CommandSeparator,
} from "@calcom/ui";

export function TeamListBulkAction() {
  const { data: teams, isLoading } = trpc.viewer.organizations.getTeams.useQuery();
  const [selectedValues, setSelectedValues] = useState<Set<number>>(new Set());
  const { t } = useLocale();

  // Add a value to the set
  const addValue = (value: number) => {
    const updatedSet = new Set(selectedValues);
    updatedSet.add(value);
    setSelectedValues(updatedSet);
  };

  // Remove a value from the set
  const removeValue = (value: number) => {
    const updatedSet = new Set(selectedValues);
    updatedSet.delete(value);
    setSelectedValues(updatedSet);
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button StartIcon={Users}>{t("add_to_team")}</Button>
      </PopoverTrigger>
      <PopoverContent className="w-[200px] p-0" align="start" sideOffset={12}>
        <Command>
          <CommandInput placeholder={t("search")} />
          <CommandList>
            <CommandEmpty>No results found.</CommandEmpty>
            <CommandGroup>
              {teams &&
                teams.map((option) => {
                  // TODO: It would be nice to pull these from data instead of options
                  const isSelected = selectedValues.has(option.id);
                  return (
                    <CommandItem
                      key={option.id}
                      onSelect={() => {
                        if (isSelected) {
                          addValue(option.id);
                        } else {
                          removeValue(option.id);
                        }
                      }}>
                      <span>{option.name}</span>
                      <div
                        className={classNames(
                          "border-subtle ml-auto flex h-4 w-4 items-center justify-center rounded-sm border",
                          isSelected ? "text-emphasis" : "opacity-50 [&_svg]:invisible"
                        )}>
                        <Check className={classNames("h-4 w-4")} />
                      </div>
                    </CommandItem>
                  );
                })}
            </CommandGroup>
            <>
              <CommandSeparator />
              <CommandGroup>
                <div className="flex w-full">
                  <Button className="ml-auto mr-1.5 rounded-md" size="sm">
                    {t("apply")}
                  </Button>
                </div>
              </CommandGroup>
            </>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
