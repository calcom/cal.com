"use client";

import { usePathname } from "next/navigation";

import { DataTableProvider } from "@calcom/features/data-table";
import { useSegments } from "@calcom/features/data-table/hooks/useSegments";
import LicenseRequired from "~/ee/common/components/LicenseRequired";
import OrgAutoJoinSetting from "~/ee/organizations/components/OrgAutoJoinSetting";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";

import { BlocklistTable } from "~/ee/organizations/privacy/blocklist-table";
import MakeTeamPrivateSwitch from "~/ee/teams/components/MakeTeamPrivateSwitch";

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
  const pathname = usePathname();
  const { t } = useLocale();
  const { data: currentOrg } = trpc.viewer.organizations.listCurrent.useQuery();
  const isInviteOpen = !currentOrg?.user.accepted;
  const isDisabled = !permissions.canEdit || isInviteOpen;

  if (!currentOrg) return null;

  if (!pathname) return null;

  return (
    <LicenseRequired>
      <div className="stack-y-8">
        <MakeTeamPrivateSwitch
          isOrg={true}
          teamId={currentOrg.id}
          isPrivate={currentOrg.isPrivate}
          disabled={isDisabled}
        />

        {currentOrg.organizationSettings?.orgAutoAcceptEmail && (
          <OrgAutoJoinSetting
            orgId={currentOrg.id}
            orgAutoJoinEnabled={!!currentOrg.organizationSettings.orgAutoJoinOnSignup}
            emailDomain={currentOrg.organizationSettings.orgAutoAcceptEmail}
          />
        )}

        {watchlistPermissions?.canRead && (
          <div>
            <div>
              <h2 className="text-emphasis text-base font-semibold">{t("organization_blocklist")}</h2>
              <p className="text-muted text-sm">{t("manage_blocked_emails_and_domains")}</p>
            </div>
            <div className="mt-2">
              <DataTableProvider tableIdentifier={pathname} useSegments={useSegments} defaultPageSize={25}>
                <BlocklistTable permissions={watchlistPermissions} />
              </DataTableProvider>
            </div>
          </div>
        )}
      </div>
    </LicenseRequired>
  );
};

export default PrivacyView;
