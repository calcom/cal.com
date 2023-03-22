import { trpc } from "@calcom/trpc";
import { Select } from "@calcom/ui";

import { useFilterContext } from "../UseFilterContext";

const UserListInTeam = () => {
  const { filter, setSelectedUserId } = useFilterContext();
  const { selectedFilter } = filter;
  if (!selectedFilter?.includes("user")) return null;

  const { selectedTeamId, selectedUserId } = filter;
  if (!selectedTeamId) return null;

  const { data, isSuccess } = trpc.viewer.analytics.userList.useQuery({
    teamId: selectedTeamId,
  });

  const UserListOptions: any =
    data?.map((item) => ({
      value: item.id,
      label: item.name ?? "",
      option: item.name ?? "",
    })) ?? ([] as { value: number; label: string }[]);

  return (
    <>
      {isSuccess && data && data?.length > 0 && (
        <Select
          isSearchable={false}
          className="mb-0 ml-2 h-[38px] w-full capitalize md:min-w-[150px] md:max-w-[200px]"
          defaultValue={selectedUserId === null ? data[0].id : selectedUserId}
          options={UserListOptions}
          onChange={(input) => {
            if (input) {
              setSelectedUserId(input);
            }
          }}
        />
      )}
    </>
  );
};

export { UserListInTeam };
