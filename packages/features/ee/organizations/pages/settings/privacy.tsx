"use client";

import { DataTableProvider } from "@calcom/features/data-table";
import { useSegments } from "@calcom/features/data-table/hooks/useSegments";
import LicenseRequired from "@calcom/features/ee/common/components/LicenseRequired";
import MakeTeamPrivateSwitch from "@calcom/features/ee/teams/components/MakeTeamPrivateSwitch";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";

import { BlocklistTable } from "~/settings/organizations/privacy/blocklist-table";

const PrivacyView = ({
  permissions,
  watchlistPermissions,
}: {
  permissions: { canRead: boolean; canEdit: boolean };
  watchlistPermissions?: {
    canRead: boolean;
    canCreate: boolean;
    canDelete: boolean;
  };
}) => {
  const { t } = useLocale();
  const { data: currentOrg } = trpc.viewer.organizations.listCurrent.useQuery();
  const isInviteOpen = !currentOrg?.user.accepted;

  const isDisabled = !permissions.canEdit || isInviteOpen;

  if (!currentOrg) return null;

  return (
    <LicenseRequired>
      <div className="space-y-6">
        <MakeTeamPrivateSwitch
          isOrg={true}
          teamId={currentOrg.id}
          isPrivate={currentOrg.isPrivate}
          disabled={isDisabled}
        />

        {watchlistPermissions?.canRead && (
          <div className="space-y-4">
            <div>
              <h2 className="text-emphasis text-lg font-semibold">{t("organization_blocklist")}</h2>
              <p className="text-muted text-sm">{t("manage_blocked_emails_and_domains")}</p>
            </div>
            <DataTableProvider useSegments={useSegments} defaultPageSize={25}>
              <BlocklistTable permissions={watchlistPermissions} />
            </DataTableProvider>
          </div>
        )}
      </div>
    </LicenseRequired>
  );
};

export default PrivacyView;
