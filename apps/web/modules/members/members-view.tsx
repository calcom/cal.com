"use client";

import { checkAdminOrOwner } from "@calcom/features/auth/lib/checkAdminOrOwner";
import { CTA_CONTAINER_CLASS_NAME } from "@calcom/features/data-table/lib/utils";
import LicenseRequired from "@calcom/features/ee/common/components/LicenseRequired";
import Shell from "@calcom/features/shell/Shell";
import { UserListTable } from "@calcom/features/users/components/UserTable/UserListTable";
import type { UserListTableProps } from "@calcom/features/users/components/UserTable/UserListTable";
import { useLocale } from "@calcom/lib/hooks/useLocale";

export const MembersView = ({ org }: UserListTableProps) => {
  const { t } = useLocale();
  const isOrgAdminOrOwner = org && checkAdminOrOwner(org.user.role);
  const canLoggedInUserSeeMembers =
    (org?.isPrivate && isOrgAdminOrOwner) || isOrgAdminOrOwner || !org?.isPrivate;

  return (
    <LicenseRequired>
      <div>{canLoggedInUserSeeMembers && <UserListTable org={org} />}</div>
      {!canLoggedInUserSeeMembers && (
        <div className="border-subtle rounded-xl border p-6" data-testid="members-privacy-warning">
          <h2 className="text-default">{t("only_admin_can_see_members_of_org")}</h2>
        </div>
      )}
    </LicenseRequired>
  );
};

const MembersPage = ({ org }: UserListTableProps) => {
  const { t } = useLocale();
  return (
    <Shell
      withoutMain={false}
      title={t("organization_members")}
      description={t("organization_description")}
      heading={t("organization_members")}
      subtitle={t("organization_description")}
      headerClassName="hidden md:block"
      actions={<div className={`mb-2 ${CTA_CONTAINER_CLASS_NAME}`} />}>
      <MembersView org={org} />
    </Shell>
  );
};

export default MembersPage;
