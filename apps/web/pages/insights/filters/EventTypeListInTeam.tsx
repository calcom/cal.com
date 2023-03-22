import { trpc } from "@calcom/trpc";

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

  return (
    <>
      {isSuccess && data && data?.length > 0 && (
        <select
          defaultValue={selectedEventTypeId === null ? data[0].id : selectedEventTypeId}
          onChange={(event) => {
            if (data && data?.length > 0) {
              setSelectedEventTypeId(Number(event.target.value));
            }
          }}
          value={selectedEventTypeId || ""}>
          {data &&
            data.map((item) => (
              <option key={item.id} value={item.id}>
                {item.title} ({item.slug})
              </option>
            ))}
        </select>
      )}
    </>
  );
};

export { EventTypeListInTeam };
