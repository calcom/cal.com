"use client";

import { useMemo, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import type { Table } from "@tanstack/react-table";

import { DataTableSelectionBar } from "@calcom/features/data-table";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { SchedulingType } from "@calcom/prisma/enums";
import { trpc } from "@calcom/trpc/react";

import { Button } from "@calid/features/ui/components/button";
import { Popover, PopoverContent, PopoverTrigger } from "@calid/features/ui/components/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@calid/features/ui/components/command";
import { Icon } from "@calid/features/ui/components/icon/Icon";
import classNames from "@calcom/ui/classNames";
import { toast } from "@calid/features/ui/components/toast/use-toast";

import type { TeamMember } from "./MembersList";

type Props = {
  table: Table<TeamMember>;
  teamId: number;
};

export function EventTypesList({ table, teamId }: Props) {
  const { t } = useLocale();
  const utils = trpc.useUtils();

  const selectedUsers = table.getSelectedRowModel().flatRows.map((r) => r.original);

  const { data } = trpc.viewer.eventTypes.getByViewer.useQuery({
    filters: { teamIds: [teamId], schedulingTypes: [SchedulingType.ROUND_ROBIN] },
  });

  const addMembers = trpc.viewer.teams.addMembersToEventTypes.useMutation({
    onError: (err) => toast({ title: t("error"), description: err.message, variant: "destructive" }),
    onSuccess: () => {
      toast({ title: t("success") });
      utils.viewer.teams.listMembers.invalidate();
      utils.viewer.eventTypes.invalidate();
      setSelectedEvents(new Set());
      table.toggleAllRowsSelected(false);
    },
  });

  const removeHosts = trpc.viewer.teams.removeHostsFromEventTypes.useMutation({
    onError: (err) => toast({ title: t("error"), description: err.message, variant: "destructive" }),
    onSuccess: () => {
      toast({ title: t("success") });
      utils.viewer.teams.listMembers.invalidate();
      utils.viewer.eventTypes.invalidate();
      setRemoveEvents(new Set());
      table.toggleAllRowsSelected(false);
    },
  });

  const [selectedEvents, setSelectedEvents] = useState<Set<number>>(new Set());
  const [removeEvents, setRemoveEvents] = useState<Set<number>>(new Set());

  const eventTypeGroups = data?.eventTypeGroups ?? [];

  const toggleSet = (
    current: Set<number>,
    setState: Dispatch<SetStateAction<Set<number>>>,
    values: number[],
    op: "add" | "remove"
  ) => {
    const next = new Set(current);
    for (const id of values) {
      if (op === "add") next.add(id);
      else next.delete(id);
    }
    setState(next);
  };

  const handleApply = async () => {
    const userIds = selectedUsers.map((u) => u.id);
    if (selectedEvents.size > 0) {
      await addMembers.mutateAsync({ userIds, eventTypeIds: Array.from(selectedEvents), teamId });
    }
    if (removeEvents.size > 0) {
      await removeHosts.mutateAsync({ userIds, eventTypeIds: Array.from(removeEvents), teamId });
    }
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <DataTableSelectionBar.Button icon="link" color="secondary">
          {t("add_to_event_type")}
        </DataTableSelectionBar.Button>
      </PopoverTrigger>
      <PopoverContent className="w-[240px] p-0" align="start" sideOffset={12}>
        <Command>
          <CommandInput placeholder={t("search")} />
          <CommandList>
            <CommandEmpty>{t("no_results_found")}</CommandEmpty>
            {eventTypeGroups.map((group) => {
              const events = group.eventTypes ?? [];
              const hostsByEventId: Record<number, number[]> = Object.fromEntries(
                events.map((e) => [e.id, e.hosts?.map((h) => h.userId) ?? []])
              );
              return (
                <CommandGroup key={group.teamId} heading={group.teamName || t("team")}>
                  {events.map((event) => {
                    const allSelectedAreHosts = selectedUsers.every((u) => (hostsByEventId[event.id] || []).includes(u.id));
                    const markedToAdd = selectedEvents.has(event.id);
                    const markedToRemove = removeEvents.has(event.id);
                    const isActive = (allSelectedAreHosts || markedToAdd) && !markedToRemove;
                    return (
                      <CommandItem
                        key={event.id}
                        onSelect={() => {
                          if (!isActive) {
                            if (allSelectedAreHosts) {
                              toggleSet(removeEvents, setRemoveEvents, [event.id], "remove");
                            } else {
                              toggleSet(selectedEvents, setSelectedEvents, [event.id], "add");
                            }
                          } else {
                            if (allSelectedAreHosts) {
                              toggleSet(removeEvents, setRemoveEvents, [event.id], "add");
                            } else {
                              toggleSet(selectedEvents, setSelectedEvents, [event.id], "remove");
                            }
                          }
                        }}
                      >
                        {event.title}
                        <div
                          className={classNames(
                            "border-subtle ml-auto flex h-4 w-4 items-center justify-center rounded-sm border",
                            isActive ? "text-emphasis" : "opacity-50 [&_svg]:invisible"
                          )}
                        >
                          <Icon name="check" className="h-4 w-4" />
                        </div>
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
              );
            })}
          </CommandList>
        </Command>
        <div className="my-1.5 flex w-full">
          <Button className="ml-auto mr-1.5 rounded-md" size="sm" onClick={handleApply}>
            {t("apply")}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}


