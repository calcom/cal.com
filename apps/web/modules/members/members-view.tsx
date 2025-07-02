"use client";

import { checkAdminOrOwner } from "@calcom/features/auth/lib/checkAdminOrOwner";
import LicenseRequired from "@calcom/features/ee/common/components/LicenseRequired";
import { UserListTable } from "@calcom/features/users/components/UserTable/UserListTable";
import type { UserListTableProps } from "@calcom/features/users/components/UserTable/UserListTable";
import { useLocale } from "@calcom/lib/hooks/useLocale";

export const MembersView = (props: UserListTableProps) => {
  const { t } = useLocale();
  const isOrgAdminOrOwner = props.org && checkAdminOrOwner(props.org.user.role);
  const canLoggedInUserSeeMembers =
    (props.org?.isPrivate && isOrgAdminOrOwner) || isOrgAdminOrOwner || !props.org?.isPrivate;

  return (
    <LicenseRequired>
      <div>{canLoggedInUserSeeMembers && <UserListTable {...props} />}</div>
      {!canLoggedInUserSeeMembers && (
        <div className="border-subtle rounded-xl border p-6" data-testid="members-privacy-warning">
          <h2 className="text-default">{t("only_admin_can_see_members_of_org")}</h2>
        </div>
      )}
    </LicenseRequired>
  );
};
