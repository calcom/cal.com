import { useLocale } from "@calcom/lib/hooks/useLocale";
import type { RouterOutputs } from "@calcom/trpc";
import { trpc } from "@calcom/trpc";
import { Select } from "@calcom/ui";

import { useFilterContext } from "../context/provider";

type User = RouterOutputs["viewer"]["insights"]["userList"][number];
type Option = { value: number; label: string };

const mapUserToOption = (user: User): Option => ({
  value: user.id,
  label: user.name ?? user.email, // every user should have at least email
});

export const UserListInTeam = () => {
  const { t } = useLocale();
  const { filter, setSelectedMemberUserId } = useFilterContext();
  const { selectedFilter, selectedTeamId, selectedMemberUserId, isOrg } = filter;
  const { data, isSuccess } = trpc.viewer.insights.userList.useQuery({
    teamId: selectedTeamId,
    isOrg: isOrg,
  });

  if (!selectedFilter?.includes("user")) return null;
  if (!selectedTeamId) return null;

  const userListOptions =
    data?.map(mapUserToOption) ?? ([{ label: "No users found", value: 0 } as Option] as Option[]);
  const selectedTeamUser = data?.find((item) => item.id === selectedMemberUserId);
  const userValue = selectedTeamUser ? mapUserToOption(selectedTeamUser) : null;

  if (!isSuccess || data?.length === 0) return null;

  return (
    <Select<Option>
      isSearchable={true}
      className="min-w-[180px] sm:max-w-[180px] lg:max-w-[150px]"
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
