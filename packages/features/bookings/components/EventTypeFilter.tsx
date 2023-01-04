import { useSession } from "next-auth/react";
import { Fragment, useState, useEffect } from "react";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc, RouterOutputs } from "@calcom/trpc/react";
import { AnimatedPopover } from "@calcom/ui";

import { groupBy } from "../groupBy";

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
  const eventTypes = trpc.viewer.eventTypes.listWithTeam.useQuery();
  const [groupedEventTypes, setGroupedEventTypes] = useState<GroupedEventTypeState>();
  // Will be handled up the tree to redirect
  useEffect(() => {
    if (!eventTypes.data) return;
    // Group event types by team
    const grouped = groupBy<IEventTypeFilter>(
      eventTypes.data.filter((el) => el.team),
      (item) => item?.team?.name || ""
    ); // Add the team name
    const individualEvents = eventTypes.data.filter((el) => !el.team);
    // push indivdual events to the start of grouped array
    setGroupedEventTypes({ user_own_event_types: individualEvents, ...grouped });
  }, [eventTypes.data, user]);

  if (!user) return null;

  return (
    <AnimatedPopover text={t("event_type")}>
      <div className="">
        {groupedEventTypes &&
          Object.keys(groupedEventTypes).map((teamName) => (
            <Fragment key={teamName}>
              <div className="p-4 text-xs font-medium uppercase leading-none text-gray-500">
                {teamName === "user_own_event_types" ? t("individual") : teamName}
              </div>
              {groupedEventTypes[teamName].map((eventType) => (
                <Fragment key={eventType.id}>
                  <div className="item-center flex px-4 py-[6px]">
                    <p className="block self-center truncate text-sm font-medium text-gray-700">
                      {eventType.title}
                    </p>
                    <div className="ml-auto">
                      <input
                        type="checkbox"
                        name=""
                        id=""
                        className="text-primary-600 focus:ring-primary-500 h-4 w-4 rounded border-gray-300 ltr:mr-2 rtl:ml-2 "
                      />
                    </div>
                  </div>
                </Fragment>
              ))}
            </Fragment>
          ))}
      </div>
    </AnimatedPopover>
  );
};
