"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import type { RouterOutputs } from "@calcom/trpc/react";
import { trpc } from "@calcom/trpc/react";
import { Dialog, ConfirmationDialogContent } from "@calcom/ui/components/dialog";
import { SettingsToggle } from "@calcom/ui/components/form";
import { SkeletonContainer, SkeletonText, SkeletonButton } from "@calcom/ui/components/skeleton";
import { showToast } from "@calcom/ui/components/toast";
import { Alert } from "@calcom/ui/components/alert";
import { Table } from "@calcom/ui/components/table";

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

interface GuestNotificationsViewProps {
  currentOrg: RouterOutputs["viewer"]["organizations"]["listCurrent"];
  permissions: {
    canRead: boolean;
    canEdit: boolean;
  };
}

const GUEST_NOTIFICATION_TYPES = [
  {
    key: "booking_confirmation",
    titleKey: "booking_confirmation",
    descriptionKey: "booking_confirmation_short_description",
  },
  {
    key: "booking_cancellation", 
    titleKey: "booking_cancellation",
    descriptionKey: "booking_cancellation_short_description",
  },
  {
    key: "booking_rescheduled",
    titleKey: "booking_rescheduled", 
    descriptionKey: "booking_rescheduled_short_description",
  },
  {
    key: "booking_requested",
    titleKey: "booking_requested",
    descriptionKey: "booking_requested_short_description",
  },
] as const;

const OrgGuestNotificationsView = ({
  permissions,
}: {
  permissions: {
    canRead: boolean;
    canEdit: boolean;
  };
}) => {
  const { t } = useLocale();
  const router = useRouter();
  const session = useSession();

  const {
    data: currentOrg,
    isPending,
    error,
  } = trpc.viewer.organizations.listCurrent.useQuery(undefined, {});

  useEffect(
    function refactorMeWithoutEffect() {
      if (error) {
        router.replace("/enterprise");
      }
    },
    [error]
  );

  if (isPending) return <SkeletonLoader />;
  if (!currentOrg) {
    return null;
  }

  return (
    <GuestNotificationsView
      currentOrg={currentOrg}
      permissions={permissions}
    />
  );
};

const GuestNotificationsView = ({ currentOrg, permissions }: GuestNotificationsViewProps) => {
  const { t } = useLocale();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [pendingChanges, setPendingChanges] = useState<{
    type: 'disable_all' | 'individual';
    value: boolean;
    notificationType?: string;
  } | null>(null);

  // Mock state - in a real implementation, this would come from the organization settings
  const [disableAllGuestEmails, setDisableAllGuestEmails] = useState(false);
  const [individualSettings, setIndividualSettings] = useState<Record<string, boolean>>({
    booking_confirmation: true,
    booking_cancellation: true,
    booking_rescheduled: true,
    booking_requested: true,
  });

  const utils = trpc.useUtils();

  // Mock mutation - in a real implementation, this would update the organization settings
  const mutation = trpc.viewer.organizations.update.useMutation({
    onSuccess: async () => {
      showToast(t("settings_updated_successfully"), "success");
    },
    onError: () => {
      showToast(t("error_updating_settings"), "error");
    },
    onSettled: () => {
      utils.viewer.organizations.listCurrent.invalidate();
    },
  });

  const handleConfirmChange = () => {
    if (!pendingChanges) return;

    if (pendingChanges.type === 'disable_all') {
      setDisableAllGuestEmails(pendingChanges.value);
      // Mock mutation call
      // mutation.mutate({ disableAllGuestEmails: pendingChanges.value });
    } else if (pendingChanges.type === 'individual' && pendingChanges.notificationType) {
      setIndividualSettings(prev => ({
        ...prev,
        [pendingChanges.notificationType!]: pendingChanges.value
      }));
      // Mock mutation call 
      // mutation.mutate({ guestNotificationSettings: { ...individualSettings, [pendingChanges.notificationType]: pendingChanges.value } });
    }

    setIsDialogOpen(false);
    setPendingChanges(null);
    showToast(t("settings_updated_successfully"), "success");
  };

  const handleDisableAllChange = (checked: boolean) => {
    setPendingChanges({
      type: 'disable_all',
      value: checked,
    });
    setIsDialogOpen(true);
  };

  const handleIndividualChange = (notificationType: string, checked: boolean) => {
    setPendingChanges({
      type: 'individual',
      value: checked,
      notificationType,
    });
    setIsDialogOpen(true);
  };

  const getConfirmationTitle = () => {
    if (!pendingChanges) return t("confirm_guest_notification_change");
    
    if (pendingChanges.type === 'disable_all') {
      return "Are you sure you want to disable all booking emails?";
    } else {
      const notificationType = GUEST_NOTIFICATION_TYPES.find(
        type => type.key === pendingChanges.notificationType
      );
      const notificationTitle = t(notificationType?.titleKey || "");
      return pendingChanges.value
        ? `Are you sure you want to enable ${notificationTitle} emails?`
        : `Are you sure you want to disable ${notificationTitle} emails?`;
    }
  };

  const getConfirmButtonText = () => {
    if (!pendingChanges) return t("confirm");
    
    if (pendingChanges.type === 'disable_all') {
      return pendingChanges.value ? "Disable all" : "Enable all";
    } else {
      return pendingChanges.value ? "Enable email" : "Disable email";
    }
  };

  const getConfirmationMessage = () => {
    if (!pendingChanges) return "";
    
    if (pendingChanges.type === 'disable_all') {
      if (pendingChanges.value) {
        // Special handling for disable all with link
        return (
          <>
            This will prevent guests from receiving important booking updates across all event types in your organization. We recommend setting up custom org-wide{" "}
            <a
              href="/workflows"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-emphasis">
              Workflows
            </a>
            .
          </>
        );
      } else {
        return t("enable_all_guest_emails_confirmation");
      }
    } else {
      const notificationType = GUEST_NOTIFICATION_TYPES.find(
        type => type.key === pendingChanges.notificationType
      );
      const notificationTitle = t(notificationType?.titleKey || "");
      
      if (pendingChanges.value) {
        return t("enable_guest_notification_confirmation", { type: notificationTitle });
      } else {
        return (
          <>
            This will prevent guests from receiving {notificationTitle} emails across all event types in your organization. We recommend setting up a custom org-wide{" "}
            <a
              href="/workflows"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-emphasis">
              Workflow
            </a>{" "}
            for this.
          </>
        );
      }
    }
  };

  return (
    <div>
      {/* Alert about critical changes */}
      <Alert
        severity="warning"
        message={t("guest_notifications_critical_warning")}
      />

      <div className="mt-2 space-y-6">
        {/* Disable all guest emails toggle */}
        <SettingsToggle
        toggleSwitchAtTheEnd={true}
        title={t("disable_all_guest_emails")}
        disabled={!permissions.canEdit}
        description={
          <>
            When enabled, guests will not receive any booking-related emails. This does not affect{" "}
            <a
              href="/workflows"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-emphasis">
              Workflow
            </a>{" "}
            emails.
          </>
        }
        checked={disableAllGuestEmails}
        onCheckedChange={handleDisableAllChange}
        switchContainerClassName="mt-6"
        />

        {/* Email notifications table */}
        <Table>
        <Table.Header>
          <Table.ColumnTitle widthClassNames="w-[20%]">Email Type</Table.ColumnTitle>
          <Table.ColumnTitle widthClassNames="w-[60%]">Description</Table.ColumnTitle>
          <Table.ColumnTitle widthClassNames="w-[20%] text-center">Enabled</Table.ColumnTitle>
        </Table.Header>
        <Table.Body>
          {GUEST_NOTIFICATION_TYPES.map((notificationType) => (
            <Table.Row key={notificationType.key}>
              <Table.Cell>
                <div className="text-emphasis text-sm font-medium py-2">
                  {t(notificationType.titleKey)}
                </div>
              </Table.Cell>
              <Table.Cell>
                <div className="text-default text-sm py-2">
                  {t(notificationType.descriptionKey)}
                </div>
              </Table.Cell>
              <Table.Cell widthClassNames="text-center">
                <div className="py-2">
                  <input
                    type="checkbox"
                    checked={individualSettings[notificationType.key] && !disableAllGuestEmails}
                    disabled={!permissions.canEdit || disableAllGuestEmails}
                    onChange={(e) => handleIndividualChange(notificationType.key, e.target.checked)}
                    className="border-default bg-default focus:bg-default active:bg-default h-4 w-4 rounded transition checked:bg-gray-800 checked:hover:bg-gray-600 hover:bg-subtle hover:border-emphasis focus:outline-none focus:ring-0 disabled:cursor-not-allowed disabled:bg-gray-300 disabled:checked:bg-gray-300"
                  />
                </div>
              </Table.Cell>
            </Table.Row>
          ))}
        </Table.Body>
        </Table>
      </div>

      {/* Confirmation Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <ConfirmationDialogContent
          variety="warning"
          title={getConfirmationTitle()}
          confirmBtnText={getConfirmButtonText()}
          onConfirm={handleConfirmChange}
          isPending={mutation?.isPending}>
          <div className="mt-2">{getConfirmationMessage()}</div>
        </ConfirmationDialogContent>
      </Dialog>
    </div>
  );
};

export default OrgGuestNotificationsView;