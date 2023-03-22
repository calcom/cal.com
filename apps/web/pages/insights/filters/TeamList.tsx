import { useEffect } from "react";

import { trpc } from "@calcom/trpc";

import { useFilterContext } from "../UseFilterContext";

const TeamList = () => {
  const { filter, setSelectedTeamId } = useFilterContext();
  const { selectedTeamId } = filter;
  const { data, isSuccess } = trpc.viewer.analytics.teamListForUser.useQuery();

  useEffect(() => {
    if (data && data?.length > 0) {
      setSelectedTeamId(data[0].id);
    }
  }, [data]);

  return (
    <>
      {isSuccess && selectedTeamId && data && data?.length > 0 && (
        <select
          defaultValue={selectedTeamId === null ? data[0].id : selectedTeamId}
          onChange={(event) => {
            if (data && data?.length > 0) {
              setSelectedTeamId(Number(event.target.value));
            }
          }}
          value={selectedTeamId}>
          {data &&
            data.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
        </select>
      )}
    </>
  );
};

export { TeamList };
