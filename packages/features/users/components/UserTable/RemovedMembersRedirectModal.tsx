import type { Dispatch, SetStateAction } from "react";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Select, Switch } from "@calcom/ui";

import type { User } from "./UserListTable";

interface Props {
  allUsers: User[];
  usersToBeRemoved: number[];
  profileRedirect: boolean;
  setProfileRedirect: Dispatch<SetStateAction<boolean>>;
  selectedMember: { value: number; label: string | null } | undefined;
  setSelectedMember: Dispatch<SetStateAction<{ value: number; label: string | null } | undefined>>;
}

export function RemovedMembersRedirectModal({
  allUsers,
  usersToBeRemoved,
  profileRedirect,
  setProfileRedirect,
  selectedMember,
  setSelectedMember,
}: Props) {
  const { t } = useLocale();

  const memberListOptions: { value: number; label: string | null }[] = allUsers
    .filter((user) => user.accepted && !usersToBeRemoved.some((id) => user.id === id))
    .map((user) => ({
      value: user.id,
      label: user.username,
    }));

  return (
    <div className="mt-3">
      <div className="flex flex-row">
        <Switch
          data-testid="profile-redirect-switch"
          checked={profileRedirect}
          id="profile-redirect-switch"
          onCheckedChange={(state) => {
            setProfileRedirect(state);
          }}
          label={t("redirect_all_future_links_to")}
        />
      </div>

      {profileRedirect && (
        <div className="mt-4">
          <div className="h-16">
            <p className="text-emphasis block text-sm font-medium">{t("team_member")}</p>
            <Select
              className="mt-1 h-4 text-white"
              name="toTeamUsername"
              data-testid="team_username_select"
              value={selectedMember}
              placeholder={t("select_team_member")}
              isSearchable
              options={memberListOptions}
              onChange={(selectedOption) => {
                if (selectedOption) {
                  setSelectedMember(selectedOption);
                }
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
