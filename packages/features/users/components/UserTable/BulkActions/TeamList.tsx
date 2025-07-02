import type { Table } from "@tanstack/react-table";
import type { Dispatch, SetStateAction } from "react";
import { useState } from "react";

import { DataTableSelectionBar } from "@calcom/features/data-table";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc";
import classNames from "@calcom/ui/classNames";
import { Button } from "@calcom/ui/components/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@calcom/ui/components/command";
import { Icon } from "@calcom/ui/components/icon";
import { Popover, PopoverContent, PopoverTrigger } from "@calcom/ui/components/popover";
import { showToast } from "@calcom/ui/components/toast";

import type { UserTableUser } from "../types";

interface Props {
  table: Table<UserTableUser>;
}

export function TeamListBulkAction({ table }: Props) {
  const { data: teams } = trpc.viewer.organizations.getTeams.useQuery();
  const [selectedValues, setSelectedValues] = useState<Set<number>>(new Set());
  const [removeFromTeams, setRemoveFromTeams] = useState<Set<number>>(new Set());
  const utils = trpc.useUtils();
  const mutation = trpc.viewer.organizations.addMembersToTeams.useMutation({
    onError: (error) => {
      showToast(error.message, "error");
    },
    onSuccess: (res) => {
      showToast(
        `${res.invitedTotalUsers} Users invited to ${Array.from(selectedValues).length} teams`,
        "success"
      );
      // Optimistically update the data from query trpc cache listMembers
      // We may need to set this data instead of invalidating. Will see how performance handles it
      utils.viewer.organizations.listMembers.invalidate();

      // Clear the selected values
      setSelectedValues(new Set());
      table.toggleAllRowsSelected(false);
    },
  });

  const removeMemberMutation = trpc.viewer.teams.removeMember.useMutation({
    onError: (error) => {
      showToast(error.message, "error");
    },
    onSuccess: () => {
      showToast(`${selectedUsers.length} Users removed from ${removeFromTeams.size} teams`, "success");

      utils.viewer.organizations.listMembers.invalidate();

      // Clear the selected values
      setRemoveFromTeams(new Set());
      table.toggleAllRowsSelected(false);
    },
  });

  const { t } = useLocale();
  const selectedUsers = table.getSelectedRowModel().flatRows.map((row) => row.original);

  // Add a value to the set
  const addValue = (set: Set<number>, setSet: Dispatch<SetStateAction<Set<number>>>, value: number) => {
    const updatedSet = new Set(set);
    updatedSet.add(value);
    setSet(updatedSet);
  };

  // Remove value from the set
  const removeValue = (set: Set<number>, setSet: Dispatch<SetStateAction<Set<number>>>, value: number) => {
    const updatedSet = new Set(set);
    updatedSet.delete(value);
    setSet(updatedSet);
  };

  return (
    <>
      <Popover>
        <PopoverTrigger asChild>
          <DataTableSelectionBar.Button icon="users" color="secondary">
            {t("add_to_team")}
          </DataTableSelectionBar.Button>
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
                    const areAllUsersInTeam = selectedUsers.every((user) =>
                      user.teams.some((team) => team.id === option.id)
                    );
                    const isSelected =
                      (selectedValues.has(option.id) || areAllUsersInTeam) && !removeFromTeams.has(option.id);

                    return (
                      <CommandItem
                        key={option.id}
                        onSelect={() => {
                          if (!isSelected) {
                            if (areAllUsersInTeam) {
                              removeValue(removeFromTeams, setRemoveFromTeams, option.id);
                            } else {
                              addValue(selectedValues, setSelectedValues, option.id);
                            }
                          } else {
                            if (areAllUsersInTeam) {
                              addValue(removeFromTeams, setRemoveFromTeams, option.id);
                            } else {
                              removeValue(selectedValues, setSelectedValues, option.id);
                            }
                          }
                        }}>
                        <span>{option.name}</span>
                        <div
                          className={classNames(
                            "border-subtle ml-auto flex h-4 w-4 items-center justify-center rounded-sm border",
                            isSelected ? "text-emphasis" : "opacity-50 [&_svg]:invisible"
                          )}>
                          <Icon name="check" className={classNames("h-4 w-4")} />
                        </div>
                      </CommandItem>
                    );
                  })}
              </CommandGroup>
            </CommandList>
          </Command>
          <div className="my-1.5 flex w-full">
            <Button
              loading={mutation.isPending}
              className="ml-auto mr-1.5 rounded-md"
              size="sm"
              onClick={async () => {
                if (selectedValues.size > 0) {
                  mutation.mutateAsync({
                    userIds: selectedUsers.map((user) => user.id),
                    teamIds: Array.from(selectedValues),
                  });
                }

                if (removeFromTeams.size > 0) {
                  removeMemberMutation.mutateAsync({
                    memberIds: selectedUsers.map((user) => user.id),
                    teamIds: Array.from(removeFromTeams),
                    isOrg: true,
                  });
                }
              }}>
              {t("apply")}
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    </>
  );
}
