import { useSession } from "next-auth/react";
import { Fragment, useState } from "react";

import {
  FilterCheckboxFieldsContainer,
  FilterCheckboxField,
} from "@calcom/features/filters/components/TeamsFilter";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import type { RouterOutputs } from "@calcom/trpc/react";
import { trpc } from "@calcom/trpc/react";
import { AnimatedPopover } from "@calcom/ui";
import { Divider } from "@calcom/ui";
import { Link } from "@calcom/ui/components/icon";

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
  const { data: query, pushItemToKey, removeItemByKeyAndValue, removeAllQueryParams } = useFilterQuery();

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
  const isEmpty = eventTypes.data.length === 0;

  const getTextForPopover = () => {
    const eventTypeIds = query.eventTypeIds;
    if (eventTypeIds) {
      return `${t("number_selected", { count: eventTypeIds.length })}`;
    }
    return `${t("all")}`;
  };

  return (
    <AnimatedPopover text={getTextForPopover()} prefix={`${t("event_type")}: `}>
      {!isEmpty ? (
        <FilterCheckboxFieldsContainer>
          <FilterCheckboxField
            id="all"
            icon={<Link className="h-4 w-4" />}
            checked={!query.eventTypeIds?.length}
            onChange={removeAllQueryParams}
            label={t("all_event_types_filter_label")}
          />
          <Divider />
          {groupedEventTypes &&
            Object.keys(groupedEventTypes).map((teamName) => (
              <Fragment key={teamName}>
                <div className="text-subtle px-4 py-2 text-xs font-medium uppercase leading-none">
                  {teamName === "user_own_event_types" ? t("individual") : teamName}
                </div>
                {groupedEventTypes[teamName].map((eventType) => (
                  <FilterCheckboxField
                    key={eventType.id}
                    checked={query.eventTypeIds?.includes(eventType.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        pushItemToKey("eventTypeIds", eventType.id);
                      } else if (!e.target.checked) {
                        removeItemByKeyAndValue("eventTypeIds", eventType.id);
                      }
                    }}
                    label={eventType.title}
                  />
                ))}
              </Fragment>
            ))}
        </FilterCheckboxFieldsContainer>
      ) : (
        <h2 className="text-default px-4 py-2 text-sm font-medium">{t("no_options_available")}</h2>
      )}
    </AnimatedPopover>
  );
};
