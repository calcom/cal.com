"use client";

import { DataTableProvider } from "@calcom/features/data-table";
import { useSegments } from "@calcom/features/data-table/hooks/useSegments";
import LicenseRequired from "@calcom/features/ee/common/components/LicenseRequired";
import MakeTeamPrivateSwitch from "@calcom/features/ee/teams/components/MakeTeamPrivateSwitch";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";

import { BookingReportsTable } from "~/settings/organizations/privacy/booking-reports-table";

const PrivacyView = ({ permissions }: { permissions: { canRead: boolean; canEdit: boolean } }) => {
  const { t } = useLocale();
  const { data: currentOrg } = trpc.viewer.organizations.listCurrent.useQuery();
  const isInviteOpen = !currentOrg?.user.accepted;

  const isDisabled = !permissions.canEdit || isInviteOpen;

  if (!currentOrg) return null;

  return (
    <LicenseRequired>
      <div className="space-y-8">
        <div>
          <h2 className="text-emphasis mb-2 text-base font-semibold leading-6">{t("privacy_settings")}</h2>
          <MakeTeamPrivateSwitch
            isOrg={true}
            teamId={currentOrg.id}
            isPrivate={currentOrg.isPrivate}
            disabled={isDisabled}
          />
        </div>

        {/* Booking Reports Section */}
        {permissions.canEdit && (
          <div>
            <h2 className="text-emphasis mb-2 text-base font-semibold leading-6">
              {t("booking_reports")}
            </h2>
            <p className="text-default mb-4 text-sm">{t("booking_reports_description")}</p>
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
