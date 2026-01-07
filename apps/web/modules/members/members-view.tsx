"use client";

import { checkAdminOrOwner } from "@calcom/features/auth/lib/checkAdminOrOwner";
import LicenseRequired from "~/ee/common/components/LicenseRequired";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { UserListTable } from "@calcom/web/modules/users/components/UserTable/UserListTable";
import type { UserListTableProps } from "@calcom/web/modules/users/components/UserTable/UserListTable";
import type { MemberPermissions } from "@calcom/features/pbac/lib/team-member-permissions";

export const MembersView = (props: UserListTableProps & { permissions?: MemberPermissions }) => {
  const { t } = useLocale();
  const { permissions, ...tableProps } = props;

  // Use PBAC permissions if available, otherwise fall back to role-based check
  const isOrgAdminOrOwner = props.org && checkAdminOrOwner(props.org.user.role);
  const canLoggedInUserSeeMembers =
    permissions?.canListMembers ??
    ((props.org?.isPrivate && isOrgAdminOrOwner) || isOrgAdminOrOwner || !props.org?.isPrivate);

  return (
    <LicenseRequired>
      <div>{canLoggedInUserSeeMembers && <UserListTable {...tableProps} permissions={permissions} />}</div>
      {!canLoggedInUserSeeMembers && (
        <div className="border-subtle rounded-xl border p-6" data-testid="members-privacy-warning">
          <h2 className="text-default">{t("only_admin_can_see_members_of_org")}</h2>
        </div>
      )}
    </LicenseRequired>
  );
};
