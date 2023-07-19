import { memo } from "react";

import { FilterCheckboxFieldsContainer } from "@calcom/features/filters/components/TeamsFilter";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import type { RouterOutputs } from "@calcom/trpc";
import { trpc } from "@calcom/trpc";
import { AnimatedPopover, CheckboxField } from "@calcom/ui";

import { useFilterContext } from "../context/provider";

type EventType = RouterOutputs["viewer"]["insights"]["eventTypeList"][number];
type Option = { value: string; label: string };

const mapEventTypeToOption = (eventType: EventType): Option => ({
  value: eventType.id.toString(),
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

  const filterOptions = data?.map(mapEventTypeToOption);

  const selectedEventType = data?.find((item) => item.id === selectedEventTypeId);
  const eventTypeValue = selectedEventType ? mapEventTypeToOption(selectedEventType) : null;

  if (!isSuccess || !data || !Array.isArray(data)) return null;

  const getPopoverText = () => {
    if (eventTypeValue?.label) {
      return `${t("event_type")}: ${eventTypeValue?.label}`;
    }
    return t("event_type");
  };

  return (
    <AnimatedPopover text={getPopoverText()}>
      <FilterCheckboxFieldsContainer>
        {filterOptions?.map((eventType) => (
          <div key={eventType.value} className="item-center hover:bg-muted flex cursor-pointer px-4 py-2">
            <CheckboxField
              checked={eventTypeValue?.value === eventType.value}
              onChange={(e) => {
                if (e.target.checked) {
                  const selectedEventTypeId = data.find((item) => item.id.toString() === eventType.value)?.id;
                  !!selectedEventTypeId &&
                    setConfigFilters({
                      selectedEventTypeId,
                    });
                } else if (!e.target.checked) {
                  setConfigFilters({
                    selectedEventTypeId: null,
                  });
                }
              }}
              description={eventType.label}
            />
          </div>
        ))}
        {filterOptions?.length === 0 && (
          <h2 className="text-default px-4 py-2 text-sm font-medium">{t("no_options_available")}</h2>
        )}
      </FilterCheckboxFieldsContainer>
    </AnimatedPopover>
  );
});

EventTypeList.displayName = "EventTypeList";
