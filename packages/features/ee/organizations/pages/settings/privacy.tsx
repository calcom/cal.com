"use client";

import { DataTableProvider } from "@calcom/features/data-table";
import { useSegments } from "@calcom/features/data-table/hooks/useSegments";
import LicenseRequired from "@calcom/features/ee/common/components/LicenseRequired";
import MakeTeamPrivateSwitch from "@calcom/features/ee/teams/components/MakeTeamPrivateSwitch";
import { trpc } from "@calcom/trpc/react";

import { BookingReportsTable } from "~/settings/organizations/privacy/booking-reports-table";

const PrivacyView = ({ permissions }: { permissions: { canRead: boolean; canEdit: boolean } }) => {
  const { data: currentOrg } = trpc.viewer.organizations.listCurrent.useQuery();
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

        {permissions.canEdit && (
          <div className="mt-8">
            <DataTableProvider useSegments={useSegments} defaultPageSize={25}>
              <BookingReportsTable />
            </DataTableProvider>
          </div>
        )}
      </div>
    </LicenseRequired>
  );
};

export default PrivacyView;
