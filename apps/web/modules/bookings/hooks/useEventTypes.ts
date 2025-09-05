import type { FacetedValue } from "@calcom/features/data-table";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { useSession } from "next-auth/react";
import { useMemo } from "react";

export function useEventTypes() {
  const { data: user } = useSession();
  const { t } = useLocale();

  const eventTypesQuery = trpc.viewer.eventTypes.listWithTeam.useQuery(undefined, {
    enabled: !!user,
  });

  return useMemo(() => {
    const eventTypes = eventTypesQuery.data || [];

    // Separate individual and team event types
    const individualEvents = eventTypes.filter((el) => !el.team);

    // Group team events by team
    const teamEventsMap = eventTypes.reduce(
      (acc, event) => {
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
      },
      {} as Record<number, { teamName: string; events: typeof eventTypes }>
    );

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
    Object.values(teamEventsMap).forEach(({ teamName, events }) => {
      if (events.length > 0) {
        flatArray.push({
          section: `${teamName} Events`,
          label: events[0].title,
          value: events[0].id,
        });
        flatArray.push(
          ...events.slice(1).map((event) => ({
            label: event.title,
            value: event.id,
          }))
        );
      }
    });

    return flatArray;
  }, [eventTypesQuery, t]);
}
