import { memo } from "react";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import type { RouterOutputs } from "@calcom/trpc";
import { trpc } from "@calcom/trpc";
import { Icon, FilterSelect } from "@calcom/ui";

import { useFilterContext } from "../context/provider";

type EventType = RouterOutputs["viewer"]["insights"]["eventTypeList"][number];

const mapEventTypeToOption = (eventType: EventType) => ({
  value: eventType.id,
  label: eventType.teamId ? `${eventType.title} (${eventType.team?.name})` : eventType.title,
});

export const EventTypeList = memo(() => {
  const { t } = useLocale();
  const { filter, setConfigFilters } = useFilterContext();
  const { selectedTeamId, selectedEventTypeId, selectedUserId, isAll } = filter;
  const { selectedFilter } = filter;

  const { data, isSuccess } = trpc.viewer.insights.eventTypeList.useQuery({
    teamId: selectedTeamId ?? undefined,
    userId: selectedUserId ?? undefined,
    isAll,
  });

  if (!selectedFilter?.includes("event-type")) return null;
  if (!selectedTeamId && !selectedUserId) return null;
  if (!isSuccess || !data || !Array.isArray(data)) return null;

  const filterOptions = data.map(mapEventTypeToOption);

  return (
    <FilterSelect
      title={t("event_type")}
      options={filterOptions}
      selectedValue={selectedEventTypeId}
      onChange={(value) => setConfigFilters({ selectedEventTypeId: value ? Number(value) : null })}
      buttonIcon={<Icon name="calendar" className="mr-2 h-4 w-4" />}
      emptyText={t("no_options_available")}
    />
  );
});

EventTypeList.displayName = "EventTypeList";
