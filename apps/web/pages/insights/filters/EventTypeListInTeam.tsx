import { trpc } from "@calcom/trpc";
import { Select } from "@calcom/ui";

import { useFilterContext } from "../UseFilterContext";

const EventTypeListInTeam = () => {
  const { filter, setSelectedEventTypeId } = useFilterContext();
  const { selectedTeamId, selectedEventTypeId } = filter;
  const { selectedFilter } = filter;
  if (!selectedFilter?.includes("event-type")) return null;

  if (!selectedTeamId) return null;
  const { data, isSuccess } = trpc.viewer.analytics.eventTypeList.useQuery({
    teamId: selectedTeamId,
  });

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
          className="mx-2 w-48"
          placeholder={
            <div className="flex flex-row">
              <p>Select Event Type</p>
            </div>
          }
        />
      )}
    </>
  );
};

export { EventTypeListInTeam };
