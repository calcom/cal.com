import { useEffect } from "react";

import type { RouterOutputs } from "@calcom/trpc";
import { trpc } from "@calcom/trpc";
import { Select } from "@calcom/ui";

import { useFilterContext } from "../context/provider";

type Team = RouterOutputs["viewer"]["insights"]["teamListForUser"][number];
type Option = { value: number; label: string };

const mapTeamToOption = (team: Team): Option => ({
  value: team.id,
  label: team.name ?? "",
});

export const TeamList = () => {
  const { filter, setSelectedTeamId, setSelectedTeamName } = useFilterContext();
  const { selectedTeamId } = filter;
  const { data, isSuccess } = trpc.viewer.insights.teamListForUser.useQuery();

  useEffect(() => {
    if (data && data?.length > 0) {
      setSelectedTeamId(data[0].id);
      setSelectedTeamName(data[0].name);
    }
  }, [data]);

  const UserListOptions = data?.map(mapTeamToOption) || ([{ label: "Empty", value: -1 }] as Option[]);
  const selectedTeam = data?.find((item) => item.id === selectedTeamId);
  const teamValue = selectedTeam ? mapTeamToOption(selectedTeam) : null;

  if (!isSuccess || !selectedTeamId || data?.length === 0) return null;

  return (
    <>
      <Select<Option>
        isSearchable={false}
        isMulti={false}
        value={teamValue}
        defaultValue={selectedTeamId ? { value: data[0].id, label: data[0].name } : null}
        className="h-[38px] w-[90vw] capitalize md:min-w-[100px] md:max-w-[100px]"
        options={UserListOptions}
        onChange={(input) => {
          if (input) {
            setSelectedTeamId(input.value);
            setSelectedTeamName(input.label);
          }
        }}
      />
    </>
  );
};
