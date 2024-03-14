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
  const isOrgAdminOrOwner =
    currentOrg &&
    (currentOrg.user.role === MembershipRole.OWNER || currentOrg.user.role === MembershipRole.ADMIN);
  const isInviteOpen = !currentOrg?.user.accepted;

  const isDisabled = isInviteOpen || !isOrgAdminOrOwner;

  if (!currentOrg) return null;

  return (
    <LicenseRequired>
      <Meta
        borderInShellHeader={false}
        title={t("privacy")}
        description={t("privacy_organization_description")}
      />
      <div>
        <MakeTeamPrivateSwitch
          isOrg={true}
          teamId={currentOrg.id}
          isPrivate={currentOrg.isPrivate}
          disabled={isDisabled}
        />
      </div>
    </LicenseRequired>
  );
};
PrivacyView.getLayout = getLayout;

export default PrivacyView;
