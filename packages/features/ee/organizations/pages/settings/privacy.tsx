"use client";

import LicenseRequired from "@calcom/features/ee/common/components/LicenseRequired";
import MakeTeamPrivateSwitch from "@calcom/features/ee/teams/components/MakeTeamPrivateSwitch";
import { getLayout } from "@calcom/features/settings/layouts/SettingsLayout";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { MembershipRole } from "@calcom/prisma/enums";
import { trpc } from "@calcom/trpc/react";
import { Meta } from "@calcom/ui";

const PrivacyView = () => {
  const { t } = useLocale();
  const { data: currentOrg } = trpc.viewer.organizations.listCurrent.useQuery();

  const isInviteOpen = !currentOrg?.user.accepted;
  const isOrgAdminOrOwner =
    currentOrg &&
    (currentOrg.user.role === MembershipRole.OWNER || currentOrg.user.role === MembershipRole.ADMIN);

  return (
    <LicenseRequired>
      <Meta title={t("privacy")} description={t("organization_description")} />
      <div>
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
PrivacyView.getLayout = getLayout;

export default PrivacyView;
