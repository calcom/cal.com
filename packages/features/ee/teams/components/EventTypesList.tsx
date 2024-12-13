import type { Table } from "@tanstack/react-table";
import type { Dispatch, SetStateAction } from "react";
import { useState, Fragment } from "react";

import { DataTableSelectionBar } from "@calcom/features/data-table";
import classNames from "@calcom/lib/classNames";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { SchedulingType } from "@calcom/prisma/enums";
import { trpc } from "@calcom/trpc";
import {
  Button,
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  Popover,
  showToast,
  PopoverContent,
  PopoverTrigger,
  Icon,
} from "@calcom/ui";

import type { User } from "./MemberList";

interface Props {
  table: Table<User>;
  teamId: number;
}

export function EventTypesList({ table, teamId }: Props) {
  const { t } = useLocale();
  const utils = trpc.useUtils();
  const { data } = trpc.viewer.eventTypes.getByViewer.useQuery({
    filters: { teamIds: [teamId], schedulingTypes: [SchedulingType.ROUND_ROBIN] },
  });
  const addMutation = trpc.viewer.teams.addMembersToEventTypes.useMutation({
    onError: (error) => {
      showToast(error.message, "error");
    },
    onSuccess: () => {
      showToast(
        `${selectedUsers.length} users added to ${Array.from(selectedEvents).length} events`,
        "success"
      );

      utils.viewer.teams.listMembers.invalidate();
      utils.viewer.eventTypes.invalidate();

      // Clear the selected values
      setSelectedEvents(new Set());
      table.toggleAllRowsSelected(false);
    },
  });
  const removeHostsMutation = trpc.viewer.teams.removeHostsFromEventTypes.useMutation({
    onError: (error) => {
      showToast(error.message, "error");
    },
    onSuccess: () => {
      showToast(
        `${selectedUsers.length} users were removed from ${Array.from(removeHostFromEvents).length} events`,
        "success"
      );

      utils.viewer.teams.listMembers.invalidate();
      utils.viewer.eventTypes.invalidate();

      // Clear the selected values
      setRemoveHostFromEvents(new Set());
      table.toggleAllRowsSelected(false);
    },
  });
  const [selectedEvents, setSelectedEvents] = useState<Set<number>>(new Set());
  const [removeHostFromEvents, setRemoveHostFromEvents] = useState<Set<number>>(new Set());
  const eventTypeGroups = data?.eventTypeGroups;
  const selectedUsers = table.getSelectedRowModel().flatRows.map((row) => row.original);

  // Add value array to the set
  const addValue = (set: Set<number>, setSet: Dispatch<SetStateAction<Set<number>>>, value: number[]) => {
    const updatedSet = new Set(set);
    value.forEach((v) => updatedSet.add(v));
    setSet(updatedSet);
  };

  // Remove value array from the set
  const removeValue = (set: Set<number>, setSet: Dispatch<SetStateAction<Set<number>>>, value: number[]) => {
    const updatedSet = new Set(set);
    value.forEach((v) => updatedSet.delete(v));
    setSet(updatedSet);
  };

  return (
    <>
      <Popover>
        <PopoverTrigger asChild>
          <DataTableSelectionBar.Button icon="link">{t("add_to_event_type")}</DataTableSelectionBar.Button>
        </PopoverTrigger>
        <PopoverContent className="w-[200px] p-0 shadow-md" align="start" sideOffset={12}>
          <Command>
            <CommandInput placeholder={t("search")} />
            <CommandList>
              <CommandEmpty>No results found.</CommandEmpty>
              <CommandGroup>
                {eventTypeGroups &&
                  eventTypeGroups.map((data) => {
                    const events = data.eventTypes;
                    const teamId = data.teamId;

                    if (events.length === 0 || !teamId) return null;
                    return (
                      <Fragment key={teamId}>
                        {events.map((event) => {
                          const hosts = event.hosts;
                          const areAllUsersHostForEventType = selectedUsers.every((user) =>
                            hosts.some((host) => host.userId === user.id)
                          );
                          const isSelected =
                            (selectedEvents.has(event.id) || areAllUsersHostForEventType) &&
                            !removeHostFromEvents.has(event.id);
                          return (
                            <ListItem
                              onSelect={() => {
                                if (!isSelected) {
                                  if (areAllUsersHostForEventType) {
                                    removeValue(removeHostFromEvents, setRemoveHostFromEvents, [event.id]);
                                  } else {
                                    // Add current event
                                    addValue(selectedEvents, setSelectedEvents, [event.id]);
                                  }
                                } else {
                                  if (areAllUsersHostForEventType) {
                                    // remove selected users as hosts
                                    addValue(removeHostFromEvents, setRemoveHostFromEvents, [event.id]);
                                  } else {
                                    // remove current event
                                    removeValue(selectedEvents, setSelectedEvents, [event.id]);
                                  }
                                }
                              }}
                              key={event.id}
                              text={event.title}
                              isSelected={isSelected}
                            />
                          );
                        })}
                      </Fragment>
                    );
                  })}
              </CommandGroup>
            </CommandList>
          </Command>
          <div className="my-1.5 flex w-full">
            <Button
              className="ml-auto mr-1.5 rounded-md"
              size="sm"
              onClick={() => {
                const userIds = selectedUsers.map((user) => user.id);
                if (selectedEvents.size > 0) {
                  addMutation.mutateAsync({
                    userIds: userIds,
                    eventTypeIds: Array.from(selectedEvents),
                    teamId,
                  });
                }

                if (removeHostFromEvents.size > 0) {
                  removeHostsMutation.mutateAsync({
                    userIds,
                    eventTypeIds: Array.from(removeHostFromEvents),
                    teamId,
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

interface ListItemProps {
  text: string;
  isSelected: boolean;
  onSelect: () => void;
}

const ListItem = ({ onSelect, text, isSelected }: ListItemProps) => {
  return (
    <CommandItem key={text} onSelect={onSelect}>
      {text}
      <div
        className={classNames(
          "border-subtle ml-auto flex h-4 w-4 items-center justify-center rounded-sm border",
          isSelected ? "text-emphasis" : "opacity-50 [&_svg]:invisible"
        )}>
        <Icon name="check" className={classNames("h-4 w-4")} />
      </div>
    </CommandItem>
  );
};
