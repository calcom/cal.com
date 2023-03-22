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

  if (!selectedFilter?.includes("event-type")) return null;
  if (!selectedTeamId) return null;

  const filterOptions =
    data?.map((item) => ({
      value: item.slug,
      label: item.title,
    })) ?? ([{ label: "No event types found", value: "" }] as { value: string; label: string }[]);

  const eventTypeValue = data?.find((item) => item.id === selectedEventTypeId)?.slug;

  if (!isSuccess || !data || !isArray(data)) return null;
  return (
    <>
      <Select
        isSearchable={false}
        isMulti={false}
        options={filterOptions}
        onChange={(input: { value: string; label: string }) => {
          if (input) {
            const selectedEventTypeId = data.find((item) => item.slug === input.value)?.id;
            !!selectedEventTypeId && setSelectedEventTypeId(selectedEventTypeId);
          }
        }}
        defaultValue={eventTypeValue}
        className="mx-2 w-48 min-w-[180px]"
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
