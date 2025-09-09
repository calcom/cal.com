"use client";

import LicenseRequired from "@calcom/features/ee/common/components/LicenseRequired";
import MakeTeamPrivateSwitch from "@calcom/features/ee/teams/components/MakeTeamPrivateSwitch";
import { trpc } from "@calcom/trpc/react";

const PrivacyView = ({ permissions }: { permissions: { canRead: boolean; canEdit: boolean } }) => {
  const { data: currentOrg } = trpc.viewer.organizations.queries.listCurrent.useQuery();
  const isInviteOpen = !currentOrg?.user.accepted;

  const isDisabled = !permissions.canEdit || isInviteOpen;

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
