import type { Table } from "@tanstack/react-table";
import { Check } from "lucide-react";
import type { Dispatch, SetStateAction } from "react";
import { useState } from "react";

import classNames from "@calcom/lib/classNames";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { SchedulingType } from "@calcom/prisma/enums";
import { trpc } from "@calcom/trpc";
import type { RouterOutputs } from "@calcom/trpc/react";
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
} from "@calcom/ui";

import type { User } from "../UserListTable";

interface Props {
  table: Table<User>;
  teams: RouterOutputs["viewer"]["organizations"]["getTeams"] | undefined;
}

export function EventListBulkAction({ table, teams }: Props) {
  const { t } = useLocale();
  const utils = trpc.useUtils();
  const teamIds = teams?.map((team) => team.id);
  const { data } = trpc.viewer.eventTypes.getByViewer.useQuery({
    filters: { teamIds, schedulingType: SchedulingType.ROUND_ROBIN },
  });
  const mutation = trpc.viewer.organizations.bulkAddToEventType.useMutation({
    onError: (error) => {
      showToast(error.message, "error");
    },
    onSuccess: (res) => {
      showToast(`${res.count} Users added to ${Array.from(selectedEvents).length} events`, "success");

      utils.viewer.organizations.listMembers.invalidate();
      utils.viewer.eventTypes.invalidate();

      // Clear the selected values
      setSelectedEvents(new Set());
      setSelectedTeams(new Set());
      table.toggleAllRowsSelected(false);
    },
  });
  const [selectedEvents, setSelectedEvents] = useState<Set<number>>(new Set());
  const [selectedTeams, setSelectedTeams] = useState<Set<number>>(new Set());
  const eventTypeGroups = data?.eventTypeGroups;

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
          <Button StartIcon="users">{t("add_to_event_type")}</Button>
        </PopoverTrigger>
        <PopoverContent className="w-[200px] p-0 shadow-md" align="start" sideOffset={12}>
          <Command>
            <CommandInput placeholder={t("search")} />
            <CommandList>
              <CommandEmpty>No results found.</CommandEmpty>
              <CommandGroup>
                {eventTypeGroups &&
                  eventTypeGroups.map((team) => {
                    const events = team.eventTypes;
                    const ids = events.map((event) => event.id);
                    const teamId = team.teamId || 0;
                    const isSelected = ids.every((id) => selectedEvents.has(id));
                    return (
                      <>
                        <ListItem
                          isTeam
                          onSelect={() => {
                            if (!isSelected) {
                              // Add current team and its event
                              addValue(selectedTeams, setSelectedTeams, [teamId]);
                              addValue(selectedEvents, setSelectedEvents, ids);
                            } else {
                              // Remove current team and its event
                              removeValue(selectedEvents, setSelectedEvents, ids);
                              removeValue(selectedTeams, setSelectedTeams, [teamId]);
                            }
                          }}
                          isSelected={isSelected}
                          text={team.profile.name || ""}
                          key={team.profile.name}
                        />
                        {events.map((event) => {
                          const isSelected = selectedEvents.has(event.id);
                          return (
                            <ListItem
                              isTeam={false}
                              onSelect={() => {
                                if (!isSelected) {
                                  // Add current event and its team
                                  addValue(selectedEvents, setSelectedEvents, [event.id]);
                                  addValue(selectedTeams, setSelectedTeams, [teamId]);
                                } else {
                                  // remove current event and its team
                                  removeValue(selectedEvents, setSelectedEvents, [event.id]);
                                  // if no event from current team is selected, remove the team
                                  setSelectedEvents((selectedEvents) => {
                                    if (!ids.some((id) => selectedEvents.has(id))) {
                                      setSelectedTeams((selectedTeams) => {
                                        const updatedTeams = new Set(selectedTeams);
                                        updatedTeams.delete(teamId);
                                        return updatedTeams;
                                      });
                                    }
                                    return selectedEvents;
                                  });
                                }
                              }}
                              key={event.id}
                              text={event.title}
                              isSelected={isSelected}
                            />
                          );
                        })}
                      </>
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
                const selectedRows = table.getSelectedRowModel().flatRows.map((row) => row.original);

                mutation.mutateAsync({
                  userIds: selectedRows.map((row) => row.id),
                  teamIds: Array.from(selectedTeams),
                  eventTypeIds: Array.from(selectedEvents),
                });
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
  isTeam: boolean;
}

const ListItem = ({ onSelect, text, isSelected, isTeam }: ListItemProps) => {
  return (
    <CommandItem
      key={text}
      onSelect={onSelect}
      className={classNames(isTeam && "text-subtle text-xs font-normal")}>
      {text}
      <div
        className={classNames(
          "border-subtle ml-auto flex h-4 w-4 items-center justify-center rounded-sm border",
          isSelected ? "text-emphasis" : "opacity-50 [&_svg]:invisible"
        )}>
        <Check className={classNames("h-4 w-4")} />
      </div>
    </CommandItem>
  );
};
