import { isArray } from "lodash";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import type { RouterOutputs } from "@calcom/trpc";
import { trpc } from "@calcom/trpc";
import { Select } from "@calcom/ui";

import { useFilterContext } from "../context/provider";

type EventType = RouterOutputs["viewer"]["insights"]["eventTypeList"][number];
type Option = { value: string; label: string };

const mapEventTypeToOption = (eventType: EventType): Option => ({
  value: eventType.slug,
  label: eventType.title,
});

export const EventTypeListInTeam = () => {
  const { t } = useLocale();
  const { filter, setSelectedEventTypeId } = useFilterContext();
  const { selectedTeamId, selectedEventTypeId } = filter;
  const { selectedFilter } = filter;
  const { data, isSuccess } = trpc.viewer.insights.eventTypeList.useQuery({
    teamId: selectedTeamId,
  });

  if (!selectedFilter?.includes("event-type")) return null;
  if (!selectedTeamId) return null;

  const filterOptions =
    data?.map(mapEventTypeToOption) ?? ([{ label: "No event types found", value: "" }] as Option[]);

  const selectedEventType = data?.find((item) => item.id === selectedEventTypeId);
  const eventTypeValue = selectedEventType ? mapEventTypeToOption(selectedEventType) : null;

  if (!isSuccess || !data || !isArray(data)) return null;
  return (
    <Select<Option>
      isSearchable={false}
      isMulti={false}
      options={filterOptions}
      onChange={(input) => {
        if (input) {
          const selectedEventTypeId = data.find((item) => item.slug === input.value)?.id;
          !!selectedEventTypeId && setSelectedEventTypeId(selectedEventTypeId);
        }
      }}
      defaultValue={eventTypeValue}
      className="w-52 min-w-[180px]"
      placeholder={
        <div className="flex flex-row">
          <p>{t("select_event_type")}</p>
        </div>
      }
    />
  );
};
