import { useFilterContext } from "@calcom/features/insights/context/provider";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc";
import { Select } from "@calcom/ui";

const UserListInTeam = () => {
  const { t } = useLocale();
  const { filter, setSelectedUserId } = useFilterContext();
  const { selectedFilter } = filter;

  const { selectedTeamId, selectedUserId } = filter;

  const { data, isSuccess } = trpc.viewer.insights.userList.useQuery({
    teamId: selectedTeamId,
  });

  if (!selectedFilter?.includes("user")) return null;
  if (!selectedTeamId) return null;

  const UserListOptions: any =
    data?.map((item) => ({
      value: item.id,
      label: item.name ?? "",
    })) ?? ([] as { value: number; label: string }[]);

  if (!isSuccess || data?.length === 0) return null;

  return (
    <>
      <Select<{ label: string; value: number }>
        className="mb-0 ml-2 h-[38px] w-40 min-w-[140px] capitalize md:min-w-[150px] md:max-w-[200px]"
        defaultValue={selectedUserId ? { value: selectedUserId, label: data[0].name || "" } : null}
        options={UserListOptions}
        onChange={(newValue) => {
          if (newValue) {
            setSelectedUserId(newValue.value);
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
