"use client";

import LicenseRequired from "@calcom/features/ee/common/components/LicenseRequired";
import { UserListTable } from "@calcom/features/users/components/UserTable/UserListTable";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { MembershipRole } from "@calcom/prisma/enums";
import { trpc } from "@calcom/trpc/react";

const MembersView = () => {
  const { t } = useLocale();
  const { data: currentOrg, isPending } = trpc.viewer.organizations.listCurrent.useQuery();

  const isOrgAdminOrOwner =
    currentOrg &&
    (currentOrg.user.role === MembershipRole.OWNER || currentOrg.user.role === MembershipRole.ADMIN);

  const canLoggedInUserSeeMembers =
    (currentOrg?.isPrivate && isOrgAdminOrOwner) || isOrgAdminOrOwner || !currentOrg?.isPrivate;

  return (
    <LicenseRequired>
      <div>{!isPending && canLoggedInUserSeeMembers && <UserListTable />}</div>
      {!canLoggedInUserSeeMembers && (
        <div className="border-subtle rounded-xl border p-6" data-testId="members-privacy-warning">
          <h2 className="text-default">{t("only_admin_can_see_members_of_org")}</h2>
        </div>
      )}
    </LicenseRequired>
  );
};

export default MembersView;
