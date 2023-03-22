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
    })) ?? ([] as { value: string; label: string }[]);

  return (
    <>
      {isSuccess && data && data?.length > 0 && (
        <Select
          isSearchable={false}
          options={filterOptions}
          onChange={(input: { value: number; label: string }) => {
            if (input) {
              setSelectedEventTypeId(input.value);
            }
          }}
          value={
            selectedEventTypeId
              ? { value: selectedEventTypeId, label: data.find((item) => item.id === selectedEventTypeId) }
              : null
          }
          className="mx-2 w-48"
          placeholder={
            <div className="flex flex-row">
              <p>{t("select_event_type")}</p>
            </div>
          }
        />
      )}
    </>
  );
};

export { EventTypeListInTeam };
