"use client";

import LicenseRequired from "@calcom/features/ee/common/components/LicenseRequired";
import MakeTeamPrivateSwitch from "@calcom/features/ee/teams/components/MakeTeamPrivateSwitch";
import { MembershipRole } from "@calcom/prisma/enums";
import { trpc } from "@calcom/trpc/react";

const PrivacyView = () => {
  const { data: currentOrg } = trpc.viewer.organizations.listCurrent.useQuery();
  const isOrgAdminOrOwner =
    currentOrg &&
    (currentOrg.user.role === MembershipRole.OWNER || currentOrg.user.role === MembershipRole.ADMIN);
  const isInviteOpen = !currentOrg?.user.accepted;

  const isDisabled = isInviteOpen || !isOrgAdminOrOwner;

  if (!currentOrg) return null;

  return (
    <LicenseRequired>
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

export default PrivacyView;
