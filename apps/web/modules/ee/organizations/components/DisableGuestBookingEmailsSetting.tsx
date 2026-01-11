"use client";

import { useState } from "react";

import { EmailType } from "@calcom/emails/email-types";
import { Dialog } from "@calcom/features/components/controlled-dialog";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { Alert } from "@calcom/ui/components/alert";
import { ConfirmationDialogContent } from "@calcom/ui/components/dialog";
import { Checkbox, SettingsToggle } from "@calcom/ui/components/form";
import { showToast } from "@calcom/ui/components/toast";

const EMAIL_TYPE_TO_SETTING_KEY = {
  [EmailType.CONFIRMATION]: "disableAttendeeConfirmationEmail",
  [EmailType.CANCELLATION]: "disableAttendeeCancellationEmail",
  [EmailType.RESCHEDULED]: "disableAttendeeRescheduledEmail",
  [EmailType.REQUEST]: "disableAttendeeRequestEmail",
  [EmailType.REASSIGNED]: "disableAttendeeReassignedEmail",
  [EmailType.AWAITING_PAYMENT]: "disableAttendeeAwaitingPaymentEmail",
  [EmailType.RESCHEDULE_REQUEST]: "disableAttendeeRescheduleRequestEmail",
  [EmailType.LOCATION_CHANGE]: "disableAttendeeLocationChangeEmail",
  [EmailType.NEW_EVENT]: "disableAttendeeNewEventEmail",
} as const;

type EmailSettings = Record<EmailType, boolean>;

interface EmailRowProps {
  emailType: EmailType;
  labelKey: string;
  descriptionKey: string;
  isDisabled: boolean;
  onToggle: (type: EmailType, disabled: boolean) => void;
  testId: string;
  disabled?: boolean;
}

const EmailRow = ({
  emailType,
  labelKey,
  descriptionKey,
  isDisabled,
  onToggle,
  testId,
  disabled,
}: EmailRowProps) => {
  const { t } = useLocale();

  return (
    <tr>
      <td className="text-default px-6 py-4 text-sm font-medium">{t(labelKey)}</td>
      <td className="text-default px-6 py-4 text-sm">{t(descriptionKey)}</td>
      <td className="px-6 py-4 text-center">
        <Checkbox
          checked={!isDisabled}
          onCheckedChange={(checked) => onToggle(emailType, !checked)}
          data-testid={testId}
          disabled={disabled}
          aria-label={t(labelKey)}
        />
      </td>
    </tr>
  );
};

interface IDisableGuestBookingEmailsSettingProps {
  orgId: number;
  settings: {
    disableAttendeeConfirmationEmail: boolean;
    disableAttendeeCancellationEmail: boolean;
    disableAttendeeRescheduledEmail: boolean;
    disableAttendeeRequestEmail: boolean;
    disableAttendeeReassignedEmail: boolean;
    disableAttendeeAwaitingPaymentEmail: boolean;
    disableAttendeeRescheduleRequestEmail: boolean;
    disableAttendeeLocationChangeEmail: boolean;
    disableAttendeeNewEventEmail: boolean;
  };
  readOnly?: boolean;
}

const EMAIL_TYPE_LABELS: Record<EmailType, string> = {
  [EmailType.CONFIRMATION]: "confirmation",
  [EmailType.CANCELLATION]: "cancellation",
  [EmailType.RESCHEDULED]: "rescheduled",
  [EmailType.REQUEST]: "request",
  [EmailType.REASSIGNED]: "host_reassignment",
  [EmailType.AWAITING_PAYMENT]: "awaiting_payment",
  [EmailType.RESCHEDULE_REQUEST]: "reschedule_request",
  [EmailType.LOCATION_CHANGE]: "location_change",
  [EmailType.NEW_EVENT]: "guest_added",
};

const DisableGuestBookingEmailsSetting = (props: IDisableGuestBookingEmailsSettingProps) => {
  const { readOnly = false } = props;
  const utils = trpc.useUtils();
  const { t } = useLocale();

  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [dialogAction, setDialogAction] = useState<"enable" | "disable">("disable");
  const [dialogMode, setDialogMode] = useState<"all" | "individual">("all");
  const [pendingEmailType, setPendingEmailType] = useState<EmailType | null>(null);

  const [emailSettings, setEmailSettings] = useState<EmailSettings>({
    [EmailType.CONFIRMATION]: props.settings.disableAttendeeConfirmationEmail,
    [EmailType.CANCELLATION]: props.settings.disableAttendeeCancellationEmail,
    [EmailType.RESCHEDULED]: props.settings.disableAttendeeRescheduledEmail,
    [EmailType.REQUEST]: props.settings.disableAttendeeRequestEmail,
    [EmailType.REASSIGNED]: props.settings.disableAttendeeReassignedEmail,
    [EmailType.AWAITING_PAYMENT]: props.settings.disableAttendeeAwaitingPaymentEmail,
    [EmailType.RESCHEDULE_REQUEST]: props.settings.disableAttendeeRescheduleRequestEmail,
    [EmailType.LOCATION_CHANGE]: props.settings.disableAttendeeLocationChangeEmail,
    [EmailType.NEW_EVENT]: props.settings.disableAttendeeNewEventEmail,
  });

  const allDisabled = Object.values(emailSettings).every(Boolean);

  const mutation = trpc.viewer.organizations.update.useMutation({
    onSuccess: async () => {
      showToast(t("your_org_updated_successfully"), "success");
    },
    onError: () => {
      showToast(t("error_updating_settings"), "error");
    },
    onSettled: () => {
      utils.viewer.organizations.listCurrent.invalidate();
    },
  });

  const handleDisableAll = (disable: boolean) => {
    const apiPayload = Object.fromEntries(
      Object.values(EMAIL_TYPE_TO_SETTING_KEY).map((key) => [key, disable])
    );
    mutation.mutate(apiPayload);

    setEmailSettings(
      Object.fromEntries(Object.values(EmailType).map((type) => [type, disable])) as EmailSettings
    );
  };

  const handleIndividualToggle = (type: EmailType, disabled: boolean) => {
    if (disabled) {
      setPendingEmailType(type);
      setDialogAction("disable");
      setDialogMode("individual");
      setShowConfirmDialog(true);
    } else {
      const settingKey = EMAIL_TYPE_TO_SETTING_KEY[type];
      mutation.mutate({ [settingKey]: false });
      setEmailSettings((prev) => ({ ...prev, [type]: false }));
    }
  };

  const confirmIndividualToggle = () => {
    if (pendingEmailType === null) return;
    const settingKey = EMAIL_TYPE_TO_SETTING_KEY[pendingEmailType];
    const shouldDisable = dialogAction === "disable";
    mutation.mutate({ [settingKey]: shouldDisable });
    setEmailSettings((prev) => ({ ...prev, [pendingEmailType]: shouldDisable }));
    setPendingEmailType(null);
  };

  return (
    <div className="space-y-6">
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <ConfirmationDialogContent
          variety={dialogAction === "disable" ? "danger" : "warning"}
          title={
            dialogMode === "all"
              ? t(
                  dialogAction === "disable"
                    ? "disable_all_guest_booking_emails_confirm_title"
                    : "enable_all_guest_booking_emails_confirm_title"
                )
              : t("disable_individual_guest_email_confirm_title", {
                  emailType: pendingEmailType ? t(EMAIL_TYPE_LABELS[pendingEmailType]) : "",
                })
          }
          confirmBtnText={t(
            dialogMode === "all"
              ? dialogAction === "disable"
                ? "disable_all"
                : "enable_all"
              : "disable_email"
          )}
          onConfirm={() => {
            if (dialogMode === "all") {
              handleDisableAll(dialogAction === "disable");
            } else {
              confirmIndividualToggle();
            }
            setShowConfirmDialog(false);
          }}>
          <p className="mt-2">
            {dialogMode === "all"
              ? t(
                  dialogAction === "disable"
                    ? "disable_all_guest_booking_emails_confirm_description"
                    : "enable_all_guest_booking_emails_confirm_description"
                )
              : t("disable_individual_guest_email_confirm_description", {
                  emailType: pendingEmailType ? t(EMAIL_TYPE_LABELS[pendingEmailType]) : "",
                })}
          </p>
        </ConfirmationDialogContent>
      </Dialog>

      <Alert severity="warning" title={t("disable_guest_emails_warning")} />

      <SettingsToggle
        toggleSwitchAtTheEnd={true}
        checked={allDisabled}
        title={t("disable_all_booking_emails_to_guests")}
        labelClassName="text-sm font-semibold"
        description={t("disable_all_booking_emails_to_guests_description")}
        switchContainerClassName="border-subtle rounded-lg border py-6 px-4 sm:px-6"
        data-testid="disable-all-guest-emails"
        disabled={readOnly}
        onCheckedChange={(checked) => {
          setDialogAction(checked ? "disable" : "enable");
          setDialogMode("all");
          setShowConfirmDialog(true);
        }}
      />

      <div className="border-subtle overflow-hidden rounded-lg border">
        <table className="w-full">
          <thead>
            <tr className="bg-muted border-subtle border-b">
              <th className="text-emphasis px-6 py-3 text-left text-sm font-medium">{t("email_type")}</th>
              <th className="text-emphasis px-6 py-3 text-left text-sm font-medium">{t("description")}</th>
              <th className="text-emphasis px-6 py-3 text-right text-sm font-medium">{t("enabled")}</th>
            </tr>
          </thead>
          <tbody className="divide-subtle divide-y">
            <EmailRow
              emailType={EmailType.CONFIRMATION}
              labelKey="confirmation"
              descriptionKey="guest_confirmation_email_description"
              isDisabled={emailSettings[EmailType.CONFIRMATION]}
              onToggle={handleIndividualToggle}
              testId="disable-guest-confirmation-email"
              disabled={readOnly || allDisabled}
            />
            <EmailRow
              emailType={EmailType.CANCELLATION}
              labelKey="cancellation"
              descriptionKey="guest_cancellation_email_description"
              isDisabled={emailSettings[EmailType.CANCELLATION]}
              onToggle={handleIndividualToggle}
              testId="disable-guest-cancellation-email"
              disabled={readOnly || allDisabled}
            />
            <EmailRow
              emailType={EmailType.RESCHEDULED}
              labelKey="rescheduled"
              descriptionKey="guest_rescheduled_email_description"
              isDisabled={emailSettings[EmailType.RESCHEDULED]}
              onToggle={handleIndividualToggle}
              testId="disable-guest-rescheduled-email"
              disabled={readOnly || allDisabled}
            />
            <EmailRow
              emailType={EmailType.REQUEST}
              labelKey="request"
              descriptionKey="attendee_request_email_description"
              isDisabled={emailSettings[EmailType.REQUEST]}
              onToggle={handleIndividualToggle}
              testId="disable-attendee-request-email"
              disabled={readOnly || allDisabled}
            />
            <EmailRow
              emailType={EmailType.REASSIGNED}
              labelKey="host_reassignment"
              descriptionKey="attendee_reassigned_email_description"
              isDisabled={emailSettings[EmailType.REASSIGNED]}
              onToggle={handleIndividualToggle}
              testId="disable-attendee-reassigned-email"
              disabled={readOnly || allDisabled}
            />
            <EmailRow
              emailType={EmailType.AWAITING_PAYMENT}
              labelKey="awaiting_payment"
              descriptionKey="attendee_awaiting_payment_email_description"
              isDisabled={emailSettings[EmailType.AWAITING_PAYMENT]}
              onToggle={handleIndividualToggle}
              testId="disable-attendee-awaiting-payment-email"
              disabled={readOnly || allDisabled}
            />
            <EmailRow
              emailType={EmailType.RESCHEDULE_REQUEST}
              labelKey="reschedule_request"
              descriptionKey="attendee_reschedule_request_email_description"
              isDisabled={emailSettings[EmailType.RESCHEDULE_REQUEST]}
              onToggle={handleIndividualToggle}
              testId="disable-attendee-reschedule-request-email"
              disabled={readOnly || allDisabled}
            />
            <EmailRow
              emailType={EmailType.LOCATION_CHANGE}
              labelKey="location_change"
              descriptionKey="attendee_location_change_email_description"
              isDisabled={emailSettings[EmailType.LOCATION_CHANGE]}
              onToggle={handleIndividualToggle}
              testId="disable-attendee-location-change-email"
              disabled={readOnly || allDisabled}
            />
            <EmailRow
              emailType={EmailType.NEW_EVENT}
              labelKey="guest_added"
              descriptionKey="attendee_new_event_email_description"
              isDisabled={emailSettings[EmailType.NEW_EVENT]}
              onToggle={handleIndividualToggle}
              testId="disable-attendee-new-event-email"
              disabled={readOnly || allDisabled}
            />
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default DisableGuestBookingEmailsSetting;
