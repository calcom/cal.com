"use client";

import { trpc } from "@calcom/trpc/react";
import LicenseRequired from "~/ee/common/components/LicenseRequired";
import DisableGuestBookingEmailsSetting, {
  DEFAULT_GUEST_EMAIL_SETTINGS,
} from "~/ee/organizations/components/DisableGuestBookingEmailsSetting";

const GuestNotificationsView = ({ permissions }: { permissions: { canRead: boolean; canEdit: boolean } }) => {
  const { data: currentOrg, isPending } = trpc.viewer.organizations.listCurrent.useQuery();
  const isInviteOpen = !currentOrg?.user.accepted;
  const isDisabled = !permissions.canEdit || isInviteOpen;

  if (isPending) {
    return (
      <LicenseRequired>
        <DisableGuestBookingEmailsSetting
          key="pending"
          orgId={0}
          isLoading
          readOnly
          settings={DEFAULT_GUEST_EMAIL_SETTINGS}
        />
      </LicenseRequired>
    );
  }

  if (!currentOrg) return null;

  if (!currentOrg.organizationSettings) return null;

  const s = currentOrg.organizationSettings;

  return (
    <LicenseRequired>
      <DisableGuestBookingEmailsSetting
        key={currentOrg.id}
        orgId={currentOrg.id}
        settings={{
          disableAttendeeConfirmationEmail: s.disableAttendeeConfirmationEmail ?? false,
          disableAttendeeCancellationEmail: s.disableAttendeeCancellationEmail ?? false,
          disableAttendeeRescheduledEmail: s.disableAttendeeRescheduledEmail ?? false,
          disableAttendeeRequestEmail: s.disableAttendeeRequestEmail ?? false,
          disableAttendeeReassignedEmail: s.disableAttendeeReassignedEmail ?? false,
          disableAttendeeAwaitingPaymentEmail: s.disableAttendeeAwaitingPaymentEmail ?? false,
          disableAttendeeRescheduleRequestEmail: s.disableAttendeeRescheduleRequestEmail ?? false,
          disableAttendeeLocationChangeEmail: s.disableAttendeeLocationChangeEmail ?? false,
          disableAttendeeNewEventEmail: s.disableAttendeeNewEventEmail ?? false,
          disableAttendeeCalVideoRecordingEmail: s.disableAttendeeCalVideoRecordingEmail ?? false,
        }}
        readOnly={isDisabled}
      />
    </LicenseRequired>
  );
};

export default GuestNotificationsView;
