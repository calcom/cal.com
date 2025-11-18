"use client";

import LicenseRequired from "@calcom/features/ee/common/components/LicenseRequired";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";

import DisableGuestBookingEmailsSetting from "../components/DisableGuestBookingEmailsSetting";

const GuestNotificationsView = ({
  permissions,
}: {
  permissions: { canRead: boolean; canEdit: boolean };
}) => {
  const { t } = useLocale();
  const { data: currentOrg } = trpc.viewer.organizations.listCurrent.useQuery();
  const isInviteOpen = !currentOrg?.user.accepted;
  const isDisabled = !permissions.canEdit || isInviteOpen;

  if (!currentOrg) return null;

  if (!currentOrg.organizationSettings) return null;

  return (
    <LicenseRequired>
      <div className="space-y-8">
        {permissions.canEdit && !isDisabled && (
          <DisableGuestBookingEmailsSetting
            orgId={currentOrg.id}
            settings={{
              disableAttendeeConfirmationEmail:
                currentOrg.organizationSettings.disableAttendeeConfirmationEmail ?? false,
              disableAttendeeCancellationEmail:
                currentOrg.organizationSettings.disableAttendeeCancellationEmail ?? false,
              disableAttendeeRescheduledEmail:
                currentOrg.organizationSettings.disableAttendeeRescheduledEmail ?? false,
              disableAttendeeRequestEmail:
                currentOrg.organizationSettings.disableAttendeeRequestEmail ?? false,
              disableAttendeeReassignedEmail:
                currentOrg.organizationSettings.disableAttendeeReassignedEmail ?? false,
              disableAttendeeAwaitingPaymentEmail:
                currentOrg.organizationSettings.disableAttendeeAwaitingPaymentEmail ?? false,
              disableAttendeeRescheduleRequestEmail:
                currentOrg.organizationSettings.disableAttendeeRescheduleRequestEmail ?? false,
              disableAttendeeLocationChangeEmail:
                currentOrg.organizationSettings.disableAttendeeLocationChangeEmail ?? false,
              disableAttendeeNewEventEmail:
                currentOrg.organizationSettings.disableAttendeeNewEventEmail ?? false,
            }}
          />
        )}
        {isDisabled && (
          <p className="text-muted text-sm">
            {t("you_need_to_accept_invitation_to_manage_guest_notifications")}
          </p>
        )}
      </div>
    </LicenseRequired>
  );
};

export default GuestNotificationsView;
