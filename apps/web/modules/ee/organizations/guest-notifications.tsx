"use client";

import LicenseRequired from "~/ee/common/components/LicenseRequired";
import { trpc } from "@calcom/trpc/react";
import { SkeletonContainer, SkeletonText, SkeletonButton } from "@calcom/ui/components/skeleton";

import DisableGuestBookingEmailsSetting from "~/ee/organizations/components/DisableGuestBookingEmailsSetting";

const SkeletonLoader = () => {
  return (
    <SkeletonContainer>
      <div className="mb-8 mt-6 space-y-6">
        <SkeletonText className="h-8 w-full" />
        <SkeletonText className="h-8 w-full" />
        <SkeletonText className="h-8 w-full" />
        <SkeletonText className="h-8 w-full" />
        <SkeletonButton className="mr-6 h-8 w-20 rounded-md p-5" />
      </div>
    </SkeletonContainer>
  );
};

const GuestNotificationsView = ({ permissions }: { permissions: { canRead: boolean; canEdit: boolean } }) => {
  const { data: currentOrg, isPending } = trpc.viewer.organizations.listCurrent.useQuery();
  const isInviteOpen = !currentOrg?.user.accepted;
  const isDisabled = !permissions.canEdit || isInviteOpen;

  if (isPending) return <SkeletonLoader />;

  if (!currentOrg) return null;

  if (!currentOrg.organizationSettings) return null;

  return (
    <LicenseRequired>
      <div className="space-y-8">
        <DisableGuestBookingEmailsSetting
          orgId={currentOrg.id}
          settings={{
            disableAttendeeConfirmationEmail:
              currentOrg.organizationSettings.disableAttendeeConfirmationEmail ?? false,
            disableAttendeeCancellationEmail:
              currentOrg.organizationSettings.disableAttendeeCancellationEmail ?? false,
            disableAttendeeRescheduledEmail:
              currentOrg.organizationSettings.disableAttendeeRescheduledEmail ?? false,
            disableAttendeeRequestEmail: currentOrg.organizationSettings.disableAttendeeRequestEmail ?? false,
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
          readOnly={isDisabled}
        />
      </div>
    </LicenseRequired>
  );
};

export default GuestNotificationsView;
