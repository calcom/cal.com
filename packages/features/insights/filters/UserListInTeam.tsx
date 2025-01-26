import { useLocale } from "@calcom/lib/hooks/useLocale";
import type { RouterOutputs } from "@calcom/trpc";
import { trpc } from "@calcom/trpc";
import { Icon, Avatar, FilterSelect } from "@calcom/ui";

import { useFilterContext } from "../context/provider";

type User = RouterOutputs["viewer"]["insights"]["userList"][number];

const mapUserToOption = (user: User) => ({
  value: user.id,
  label: user.name ?? user.email,
  icon: <Avatar alt={`${user.name} avatar`} imageSrc={user.avatarUrl} size="sm" className="mr-2" />,
});

export const UserListInTeam = ({ onClear }: { onClear?: () => void }) => {
  const { t } = useLocale();
  const { filter, setConfigFilters } = useFilterContext();
  const { selectedFilter, selectedTeamId, selectedMemberUserId, isAll } = filter;

  const { data, isSuccess } = trpc.viewer.insights.userList.useQuery({
    teamId: selectedTeamId ?? -1,
    isAll: !!isAll,
  });

  if (!selectedFilter?.includes("user")) {
    return null;
  }

  if (!selectedTeamId || !isSuccess || data?.length === 0) {
    return null;
  }

  const userListOptions = data.map(mapUserToOption);

  return (
    <FilterSelect
      title={t("people")}
      options={userListOptions}
      selectedValue={selectedMemberUserId}
      onChange={(value) => {
        setConfigFilters({ selectedMemberUserId: value === null ? null : Number(value) });
        if (value === null) {
          onClear?.();
        }
      }}
      buttonIcon={<Icon name="users" className="mr-2 h-4 w-4" />}
      placeholder={t("search")}
      testId="people-filter"
    />
  );
};
