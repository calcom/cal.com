"use client";

import LicenseRequired from "@calcom/features/ee/common/components/LicenseRequired";
import MakeTeamPrivateSwitch from "@calcom/features/ee/teams/components/MakeTeamPrivateSwitch";
import { OrgWatchlistTable } from "@calcom/features/ee/watchlist/components/OrgWatchlistTable";
import { trpc } from "@calcom/trpc/react";

const PrivacyView = ({
  permissions,
  organizationId,
}: {
  permissions: { canRead: boolean; canEdit: boolean };
  organizationId: number;
}) => {
  const { data: currentOrg } = trpc.viewer.organizations.listCurrent.useQuery();
  const isInviteOpen = !currentOrg?.user.accepted;

  const isDisabled = !permissions.canEdit || isInviteOpen;

  if (!currentOrg) return null;

  return (
    <LicenseRequired>
      <div className="space-y-8">
        {/* Organization Privacy Toggle */}
        <div>
          <MakeTeamPrivateSwitch
            isOrg={true}
            teamId={currentOrg.id}
            isPrivate={currentOrg.isPrivate}
            disabled={isDisabled}
          />
        </div>

        {/* Watchlist Management */}
        <div>
          <h3 className="text-emphasis mb-1 text-base font-semibold leading-5">Blocked Emails & Domains</h3>
          <p className="text-subtle mb-4 text-sm">
            Manage organization-specific email and domain blocking for privacy and security.
          </p>
          <OrgWatchlistTable organizationId={organizationId} canEdit={permissions.canEdit} />
        </div>
      </div>
    </LicenseRequired>
  );
};

export default PrivacyView;
