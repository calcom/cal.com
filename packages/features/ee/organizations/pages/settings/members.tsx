"use client";

import LicenseRequired from "@calcom/features/ee/common/components/LicenseRequired";
import MakeTeamPrivateSwitch from "@calcom/features/ee/teams/components/MakeTeamPrivateSwitch";
import { getLayout } from "@calcom/features/settings/layouts/SettingsLayout";
import { UserListTable } from "@calcom/features/users/components/UserTable/UserListTable";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { MembershipRole } from "@calcom/prisma/enums";
import { trpc } from "@calcom/trpc/react";
import { Meta } from "@calcom/ui";

const MembersView = () => {
  const { t } = useLocale();
  const { data: currentOrg } = trpc.viewer.organizations.listCurrent.useQuery();

  const isInviteOpen = !currentOrg?.user.accepted;
  const isOrgAdminOrOwner =
    currentOrg &&
    (currentOrg.user.role === MembershipRole.OWNER || currentOrg.user.role === MembershipRole.ADMIN);

  return (
    <LicenseRequired>
      <Meta title={t("organization_members")} description={t("organization_description")} />
      <div>
        {((currentOrg?.isPrivate && isOrgAdminOrOwner) || isOrgAdminOrOwner || !currentOrg?.isPrivate) && (
          <UserListTable />
        )}
        {currentOrg && isOrgAdminOrOwner && (
          <MakeTeamPrivateSwitch
            isOrg={true}
            teamId={currentOrg.id}
            isPrivate={currentOrg.isPrivate}
            disabled={isInviteOpen}
          />
        )}
      </div>
    </LicenseRequired>
  );
};
MembersView.getLayout = getLayout;

export default MembersView;
