import type { Table } from "@tanstack/react-table";
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
  PopoverContent,
  PopoverTrigger,
  CommandSeparator,
  showToast,
} from "@calcom/ui";

import type { User } from "../UserListTable";

interface Props {
  table: Table<User>;
}

export function TeamListBulkAction({ table }: Props) {
  const { data: teams } = trpc.viewer.organizations.getTeams.useQuery();
  const mutation = trpc.viewer.organizations.bulkAddToTeams.useMutation({
    onError: (error) => {
      showToast(error.message, "error");
    },
    onSuccess: (res) => {
      showToast(
        `${res.invitedTotalUsers} Users invited to ${Array.from(selectedValues).length} teams`,
        "success"
      );
    },
  });
  const [selectedValues, setSelectedValues] = useState<Set<number>>(new Set());

  const { t } = useLocale();

  // Add a value to the set
  const addValue = (value: number) => {
    const updatedSet = new Set(selectedValues);
    console.log({
      updatedSet,
      selectedValues,
    });
    updatedSet.add(value);
    setSelectedValues(updatedSet);
    console.log({
      updatedSet,
      selectedValues,
    });
  };

  // Remove a value from the set
  const removeValue = (value: number) => {
    const updatedSet = new Set(selectedValues);
    updatedSet.delete(value);
    setSelectedValues(updatedSet);
  };

  return (
    <>
      <Popover>
        <PopoverTrigger asChild>
          <Button StartIcon={Users}>{t("add_to_team")}</Button>
        </PopoverTrigger>
        {/* We dont really use shadows much - but its needed here  */}
        <PopoverContent className="w-[200px] p-0 shadow-md" align="start" sideOffset={12}>
          <Command>
            <CommandInput placeholder={t("search")} />
            <CommandList>
              <CommandEmpty>No results found.</CommandEmpty>
              <CommandGroup>
                {teams &&
                  teams.map((option) => {
                    const isSelected = selectedValues.has(option.id);
                    return (
                      <CommandItem
                        key={option.id}
                        onSelect={() => {
                          console.log("onSelect", isSelected);
                          if (!isSelected) {
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
                  <div className="mb-1.5 flex w-full">
                    <Button
                      loading={mutation.isLoading}
                      className="ml-auto mr-1.5 rounded-md"
                      size="sm"
                      onClick={async () => {
                        const selectedRows = table.getSelectedRowModel().flatRows.map((row) => row.original);
                        mutation.mutateAsync({
                          userIds: selectedRows.map((row) => row.id),
                          teamIds: Array.from(selectedValues),
                        });
                      }}>
                      {t("apply")}
                    </Button>
                  </div>
                </CommandGroup>
              </>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </>
  );
}
