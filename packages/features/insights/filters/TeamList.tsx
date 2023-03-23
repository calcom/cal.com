import { useEffect } from "react";

import { trpc } from "@calcom/trpc";
import { Select } from "@calcom/ui";

import { useFilterContext } from "../context/provider";

type Option = { value: number; label: string };

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

  const UserListOptions =
    data?.map((item) => ({
      value: item.id,
      label: item.name ?? "",
    })) || ([{ label: "Empty", value: -1 }] as { value: number; label: string }[]);

  if (!isSuccess || !selectedTeamId || data?.length === 0) return null;

  return (
    <>
      <Select<Option>
        isSearchable={false}
        isMulti={false}
        value={
          selectedTeamId
            ? {
                value: selectedTeamId,
                label: data.find((item: { id: number; name: string }) => item.id === selectedTeamId)?.name,
              }
            : undefined
        }
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
