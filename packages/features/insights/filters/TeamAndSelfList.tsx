import { useEffect } from "react";

import type { RouterOutputs } from "@calcom/trpc";
import { trpc } from "@calcom/trpc";
import { Select } from "@calcom/ui";

import { useFilterContext } from "../context/provider";

type Team = RouterOutputs["viewer"]["insights"]["teamListForUser"][number];
type Option = { value: number; label: string | null; userId?: number };

const mapTeamToOption = (team: Team): Option => ({
  value: team.id,
  label: team.name ?? "",
  userId: team.userId,
});

export const TeamAndSelfList = () => {
  const { filter, setSelectedTeamId, setSelectedTeamName, setSelectedUserId } = useFilterContext();
  const { selectedTeamId, selectedUserId } = filter;
  const { data, isSuccess } = trpc.viewer.insights.teamListForUser.useQuery();

  useEffect(() => {
    if (data && data?.length > 0) {
      // We have a team?
      if (data[0].id) {
        setSelectedTeamId(data[0].id);
        setSelectedTeamName(data[0].name);
      } else if (data[0].userId) {
        // default to user
        setSelectedUserId(data[0].userId);
      }
    }
  }, [data]);

  const UserListOptions = data?.map(mapTeamToOption) || ([{ label: "Empty", value: -1 }] as Option[]);
  const selectedTeam = data?.find((item) => {
    if (!!selectedUserId && !selectedTeamId) {
      return item.userId === selectedUserId;
    }
    return item.id === selectedTeamId;
  });
  const teamValue = selectedTeam ? mapTeamToOption(selectedTeam) : null;

  if (!isSuccess || data?.length === 0) return null;

  return (
    <>
      <Select<Option>
        isSearchable={false}
        isMulti={false}
        value={teamValue}
        defaultValue={selectedTeamId ? { value: data[0].id, label: data[0].name } : null}
        className="h-[38px] w-[90vw] min-w-[160px] max-w-[100px]"
        options={UserListOptions}
        onChange={(input) => {
          if (!!input?.userId) {
            setSelectedUserId(input.userId);
          } else if (input && input.value) {
            setSelectedTeamId(input.value);
            setSelectedTeamName(input.label);
          }
        }}
      />
    </>
  );
};
