import { useSession } from "next-auth/react";
import { useAction } from "next-safe-action/hooks";
import { useEffect, useMemo, useState } from "react";

import type { FacetedValue } from "@calcom/features/data-table";
import { useLocale } from "@calcom/lib/hooks/useLocale";

import { listWithTeamAction } from "../../../app/(use-page-wrapper)/event-types/queries/actions";

export function useEventTypes() {
  const { data: user } = useSession();
  const { t } = useLocale();
  const [eventTypesData, setEventTypesData] = useState<RouterOutputs["viewer"]["eventTypes"]["listWithTeam"]>(
    []
  );

  const { execute: executeListWithTeam } = useAction(listWithTeamAction, {
    onSuccess: (result) => {
      setEventTypesData(result?.data || []);
    },
  });

  useEffect(() => {
    if (user) {
      executeListWithTeam();
    }
  }, [user, executeListWithTeam]);

  return useMemo(() => {
    const eventTypes = eventTypesData || [];

    // Separate individual and team event types
    const individualEvents = eventTypes.filter((el) => !el.team);

    // Group team events by team
    const teamEventsMap = eventTypes.reduce((acc, event) => {
      if (!event.team) return acc;

      const teamId = event.team.id;
      if (!acc[teamId]) {
        acc[teamId] = {
          teamName: event.team.name,
          events: [],
        };
      }
      acc[teamId].events.push(event);
      return acc;
    }, {} as Record<number, { teamName: string; events: Array<{ id: number; title: string; team?: { id: number; name: string } }> }>);

    // Create flat array with section markers
    const flatArray: FacetedValue[] = [];

    // Add individual events section if exists
    if (individualEvents.length > 0) {
      flatArray.push({
        section: t("individual"),
        label: individualEvents[0].title,
        value: individualEvents[0].id,
      });
      flatArray.push(
        ...individualEvents.slice(1).map((event) => ({
          label: event.title,
          value: event.id,
        }))
      );
    }

    // Add each team's events as a separate section
    Object.values(teamEventsMap).forEach(
      ({
        teamName,
        events,
      }: {
        teamName: string;
        events: Array<{ id: number; title: string; team?: { id: number; name: string } }>;
      }) => {
        if (events.length > 0) {
          flatArray.push({
            section: `${teamName} Events`,
            label: events[0].title,
            value: events[0].id,
          });
          flatArray.push(
            ...events.slice(1).map((event: { title: string; id: number }) => ({
              label: event.title,
              value: event.id,
            }))
          );
        }
      }
    );

    return flatArray;
  }, [eventTypesData, t]);
}
