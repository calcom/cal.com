import { useLocale } from "@calcom/lib/hooks/useLocale";
import type { RouterOutputs } from "@calcom/trpc";
import { trpc } from "@calcom/trpc";
import { Select } from "@calcom/ui";

import { useFilterContext } from "../context/provider";

type User = RouterOutputs["viewer"]["insights"]["userList"][number];
type Option = { value: number; label: string };

const mapUserToOption = (user: User): Option => ({
  value: user.id,
  label: user.name ?? "",
});

export const UserListInTeam = () => {
  const { t } = useLocale();
  const { filter, setSelectedMemberUserId } = useFilterContext();
  const { selectedFilter, selectedTeamId, selectedMemberUserId } = filter;
  const { data, isSuccess } = trpc.viewer.insights.userList.useQuery({
    teamId: selectedTeamId,
  });

  if (!selectedFilter?.includes("user")) return null;
  if (!selectedTeamId) return null;

  const userListOptions = data?.map(mapUserToOption) ?? ([] as { value: number; label: string }[]);
  const selectedTeamUser = data?.find((item) => item.id === selectedMemberUserId);
  const userValue = selectedTeamUser ? mapUserToOption(selectedTeamUser) : null;

  if (!isSuccess || data?.length === 0) return null;

  return (
    <Select<Option>
      isSearchable={true}
      className="mb-0 h-[38px] w-40 min-w-[140px] capitalize md:min-w-[150px] md:max-w-[200px]"
      defaultValue={userValue}
      value={userValue}
      options={userListOptions}
      onChange={(input) => {
        if (input) {
          setSelectedMemberUserId(input.value);
        }
      }}
      placeholder={
        <div className="flex flex-row">
          <p>{t("select_user")}</p>
        </div>
      }
    />
  );
};
