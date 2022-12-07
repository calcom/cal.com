import { useSession } from "next-auth/react";
import { Fragment, useState, useEffect } from "react";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc, RouterOutputs } from "@calcom/trpc/react";
import { Avatar, AnimatedPopover } from "@calcom/ui";

type EventTypes = RouterOutputs["viewer"]["eventTypes"]["listWithTeam"];
type EventType = EventTypes[0];

type KeySelector<T> = (item: T) => string;

function groupBy<T>(array: Iterable<T>, keySelector: KeySelector<T>): Record<string, T[]> {
  return Array.from(array).reduce(
    (acc: Record<string, T[]>, item: T) => {
      const key = keySelector(item);
      if (key in acc) {
        // found key, push new item into existing array
        acc[key].push(item);
      } else {
        // did not find key, create new array
        acc[key] = [item];
      }
      return acc;
    },
    {} // start with empty object
  );
}

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
    if (eventTypes.data) {
      // Group event types by team
      const grouped = groupBy<EventType>(
        eventTypes.data.filter((el) => el.team),
        (item) => item?.team?.name || ""
      ); // Add the team name
      const individualEvents = eventTypes.data.filter((el) => !el.team);
      // push indivdual events to the start of grouped array
      setGroupedEventTypes({ user_own_event_types: individualEvents, ...grouped });
    }
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
                    <p className="block self-center text-sm font-medium text-gray-700">{eventType.title}</p>
                    <div className="ml-auto">
                      <input
                        type="checkbox"
                        name=""
                        id=""
                        className="text-primary-600 focus:ring-primary-500 mr-2 h-4 w-4 rounded border-gray-300 "
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
