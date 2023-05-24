import { useSession } from "next-auth/react";
import { Fragment, useState } from "react";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import type { RouterOutputs } from "@calcom/trpc/react";
import { trpc } from "@calcom/trpc/react";
import { AnimatedPopover } from "@calcom/ui";
import { Checkbox } from "@calcom/ui";

import { groupBy } from "../groupBy";
import { useFilterQuery } from "../lib/useFilterQuery";

export type IEventTypesFilters = RouterOutputs["viewer"]["eventTypes"]["listWithTeam"];
export type IEventTypeFilter = IEventTypesFilters[0];

type GroupedEventTypeState = Record<
  string,
  {
    team: {
      id: number;
      name: string;
    } | null;
    id: number;
    title: string;
    slug: string;
  }[]
>;

export const EventTypeFilter = () => {
  const { t } = useLocale();
  const { data: user } = useSession();
  const { data: query, pushItemToKey, removeItemByKeyAndValue } = useFilterQuery();

  const [groupedEventTypes, setGroupedEventTypes] = useState<GroupedEventTypeState>();

  const eventTypes = trpc.viewer.eventTypes.listWithTeam.useQuery(undefined, {
    onSuccess: (data) => {
      // Will be handled up the tree to redirect
      // Group event types by team
      const grouped = groupBy<IEventTypeFilter>(
        data.filter((el) => el.team),
        (item) => item?.team?.name || ""
      ); // Add the team name
      const individualEvents = data.filter((el) => !el.team);
      // push indivdual events to the start of grouped array
      setGroupedEventTypes(
        individualEvents.length > 0 ? { user_own_event_types: individualEvents, ...grouped } : grouped
      );
    },
    enabled: !!user,
  });

  if (!eventTypes.data) return null;

  const isNotEmpty = eventTypes.data.length > 0;

  return eventTypes.status === "success" && isNotEmpty ? (
    <AnimatedPopover text={t("event_type")}>
      <div className="">
        {groupedEventTypes &&
          Object.keys(groupedEventTypes).map((teamName) => (
            <Fragment key={teamName}>
              <div className="text-subtle p-4 text-xs font-medium uppercase leading-none">
                {teamName === "user_own_event_types" ? t("individual") : teamName}
              </div>
              {groupedEventTypes[teamName].map((eventType) => (
                <div key={eventType.id} className="item-center flex px-4 py-1.5">
                  <Checkbox
                    checked={query.eventTypeIds?.includes(eventType.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        pushItemToKey("eventTypeIds", eventType.id);
                      } else if (!e.target.checked) {
                        removeItemByKeyAndValue("eventTypeIds", eventType.id);
                      }
                    }}
                    description={eventType.title}
                  />
                </div>
              ))}
            </Fragment>
          ))}
      </div>
    </AnimatedPopover>
  ) : null;
};
