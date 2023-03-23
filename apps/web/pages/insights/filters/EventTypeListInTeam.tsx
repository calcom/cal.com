import { isArray } from "lodash";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc";
import { Select } from "@calcom/ui";

import { useFilterContext } from "../UseFilterContext";

const EventTypeListInTeam = () => {
  const { t } = useLocale();
  const { filter, setSelectedEventTypeId } = useFilterContext();
  const { selectedTeamId, selectedEventTypeId } = filter;
  const { selectedFilter } = filter;
  const { data, isSuccess } = trpc.viewer.analytics.eventTypeList.useQuery({
    teamId: selectedTeamId,
  });

  if (!selectedFilter?.includes("event-type") || !selectedTeamId || data?.length === 0) return null;

  const filterOptions = data?.map((item) => ({
    value: item.slug,
    label: item.title,
  })) ?? [{ label: "No event types found", value: "" }];

  const eventTypeValue = data?.find((item) => item.id === selectedEventTypeId);

  if (!isSuccess || !data || !isArray(data)) return null;
  return (
    <>
      <Select<{ label: string; value: string }>
        options={filterOptions}
        onChange={(input) => {
          if (input) {
            const selectedEventTypeId = data.find((item) => item.slug === input.value)?.id;
            !!selectedEventTypeId && setSelectedEventTypeId(selectedEventTypeId);
          }
        }}
        value={eventTypeValue ? { value: eventTypeValue?.slug, label: eventTypeValue?.title } : null}
        defaultValue={eventTypeValue ? { value: eventTypeValue?.slug, label: eventTypeValue?.title } : null}
        className="w-52 min-w-[180px]"
        placeholder={
          <div className="flex flex-row">
            <p>{t("select_event_type")}</p>
          </div>
        }
      />
    </>
  );
};

export { EventTypeListInTeam };
