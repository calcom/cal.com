import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc";
import { Select } from "@calcom/ui";

import { useFilterContext } from "../UseFilterContext";

const UserListInTeam = () => {
  const { t } = useLocale();
  const { filter, setSelectedUserId } = useFilterContext();
  const { selectedFilter } = filter;

  const { selectedTeamId, selectedUserId } = filter;

  const { data, isSuccess } = trpc.viewer.analytics.userList.useQuery({
    teamId: selectedTeamId,
  });

  if (!selectedFilter?.includes("user")) return null;
  if (!selectedTeamId) return null;

  const UserListOptions: any =
    data?.map((item) => ({
      value: item.id,
      label: item.name ?? "",
      option: item.name ?? "",
    })) ?? ([] as { value: number; label: string }[]);

  if (!isSuccess || data?.length === 0) return null;

  return (
    <>
      <Select
        isSearchable={false}
        className="mb-0 ml-2 h-[38px] w-full capitalize md:min-w-[150px] md:max-w-[200px]"
        defaultValue={selectedUserId === null ? data[0].id : selectedUserId}
        options={UserListOptions}
        onChange={(input: { value: number; label: string }) => {
          if (input) {
            setSelectedUserId(input.value);
          }
        }}
        placeholder={
          <div className="flex flex-row">
            <p>{t("select_user")}</p>
          </div>
        }
      />
    </>
  );
};

export { UserListInTeam };
