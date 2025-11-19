"use client";

import { useState } from "react";

import { Dialog } from "@calcom/features/components/controlled-dialog";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc";
import { Alert } from "@calcom/ui/components/alert";
import { ConfirmationDialogContent } from "@calcom/ui/components/dialog";
import { Switch } from "@calcom/ui/components/form";
import { SettingsToggle } from "@calcom/ui/components/form";
import { showToast } from "@calcom/ui/components/toast";

type EmailType =
  | "confirmation"
  | "cancellation"
  | "rescheduled"
  | "request"
  | "reassigned"
  | "awaiting_payment"
  | "reschedule_request"
  | "location_change"
  | "new_event";

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
      <td className="px-6 py-4 text-right">
        <Switch
          checked={!isDisabled}
          onCheckedChange={(checked) => onToggle(emailType, !checked)}
          data-testid={testId}
          disabled={disabled}
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

const DisableGuestBookingEmailsSetting = (props: IDisableGuestBookingEmailsSettingProps) => {
  const { readOnly = false } = props;
  const utils = trpc.useUtils();
  const { t } = useLocale();

  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  const [disableConfirmation, setDisableConfirmation] = useState(
    props.settings.disableAttendeeConfirmationEmail
  );
  const [disableCancellation, setDisableCancellation] = useState(
    props.settings.disableAttendeeCancellationEmail
  );
  const [disableRescheduled, setDisableRescheduled] = useState(
    props.settings.disableAttendeeRescheduledEmail
  );

  const [disableRequest, setDisableRequest] = useState(props.settings.disableAttendeeRequestEmail);
  const [disableReassigned, setDisableReassigned] = useState(props.settings.disableAttendeeReassignedEmail);
  const [disableAwaitingPayment, setDisableAwaitingPayment] = useState(
    props.settings.disableAttendeeAwaitingPaymentEmail
  );
  const [disableRescheduleRequest, setDisableRescheduleRequest] = useState(
    props.settings.disableAttendeeRescheduleRequestEmail
  );
  const [disableLocationChange, setDisableLocationChange] = useState(
    props.settings.disableAttendeeLocationChangeEmail
  );
  const [disableNewEvent, setDisableNewEvent] = useState(props.settings.disableAttendeeNewEventEmail);

  const allDisabled =
    disableConfirmation &&
    disableCancellation &&
    disableRescheduled &&
    disableRequest &&
    disableReassigned &&
    disableAwaitingPayment &&
    disableRescheduleRequest &&
    disableLocationChange &&
    disableNewEvent;

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
    mutation.mutate({
      disableAttendeeConfirmationEmail: disable,
      disableAttendeeCancellationEmail: disable,
      disableAttendeeRescheduledEmail: disable,
      disableAttendeeRequestEmail: disable,
      disableAttendeeReassignedEmail: disable,
      disableAttendeeAwaitingPaymentEmail: disable,
      disableAttendeeRescheduleRequestEmail: disable,
      disableAttendeeLocationChangeEmail: disable,
      disableAttendeeNewEventEmail: disable,
    });
    setDisableConfirmation(disable);
    setDisableCancellation(disable);
    setDisableRescheduled(disable);
    setDisableRequest(disable);
    setDisableReassigned(disable);
    setDisableAwaitingPayment(disable);
    setDisableRescheduleRequest(disable);
    setDisableLocationChange(disable);
    setDisableNewEvent(disable);
  };

  const handleIndividualToggle = (
    type:
      | "confirmation"
      | "cancellation"
      | "rescheduled"
      | "request"
      | "reassigned"
      | "awaiting_payment"
      | "reschedule_request"
      | "location_change"
      | "new_event",
    checked: boolean
  ) => {
    const updates: Record<string, boolean> = {};

    switch (type) {
      case "confirmation":
        updates.disableAttendeeConfirmationEmail = checked;
        setDisableConfirmation(checked);
        break;
      case "cancellation":
        updates.disableAttendeeCancellationEmail = checked;
        setDisableCancellation(checked);
        break;
      case "rescheduled":
        updates.disableAttendeeRescheduledEmail = checked;
        setDisableRescheduled(checked);
        break;
      case "request":
        updates.disableAttendeeRequestEmail = checked;
        setDisableRequest(checked);
        break;
      case "reassigned":
        updates.disableAttendeeReassignedEmail = checked;
        setDisableReassigned(checked);
        break;
      case "awaiting_payment":
        updates.disableAttendeeAwaitingPaymentEmail = checked;
        setDisableAwaitingPayment(checked);
        break;
      case "reschedule_request":
        updates.disableAttendeeRescheduleRequestEmail = checked;
        setDisableRescheduleRequest(checked);
        break;
      case "location_change":
        updates.disableAttendeeLocationChangeEmail = checked;
        setDisableLocationChange(checked);
        break;
      case "new_event":
        updates.disableAttendeeNewEventEmail = checked;
        setDisableNewEvent(checked);
        break;
    }

    mutation.mutate(updates);
  };

  return (
    <div className="space-y-6">
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <ConfirmationDialogContent
          variety="warning"
          title={t("disable_all_guest_booking_emails_confirm_title")}
          confirmBtnText={t("disable_all")}
          onConfirm={() => {
            handleDisableAll(true);
            setShowConfirmDialog(false);
          }}>
          <p className="mt-2">{t("disable_all_guest_booking_emails_confirm_description")}</p>
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
          if (checked) {
            setShowConfirmDialog(true);
          } else {
            handleDisableAll(false);
          }
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
              emailType="confirmation"
              labelKey="confirmation"
              descriptionKey="guest_confirmation_email_description"
              isDisabled={disableConfirmation}
              onToggle={handleIndividualToggle}
              testId="disable-guest-confirmation-email"
              disabled={readOnly || allDisabled}
            />
            <EmailRow
              emailType="cancellation"
              labelKey="cancellation"
              descriptionKey="guest_cancellation_email_description"
              isDisabled={disableCancellation}
              onToggle={handleIndividualToggle}
              testId="disable-guest-cancellation-email"
              disabled={readOnly || allDisabled}
            />
            <EmailRow
              emailType="rescheduled"
              labelKey="rescheduled"
              descriptionKey="guest_rescheduled_email_description"
              isDisabled={disableRescheduled}
              onToggle={handleIndividualToggle}
              testId="disable-guest-rescheduled-email"
              disabled={readOnly || allDisabled}
            />
            <EmailRow
              emailType="request"
              labelKey="request"
              descriptionKey="attendee_request_email_description"
              isDisabled={disableRequest}
              onToggle={handleIndividualToggle}
              testId="disable-attendee-request-email"
              disabled={readOnly || allDisabled}
            />
            <EmailRow
              emailType="reassigned"
              labelKey="host_reassignment"
              descriptionKey="attendee_reassigned_email_description"
              isDisabled={disableReassigned}
              onToggle={handleIndividualToggle}
              testId="disable-attendee-reassigned-email"
              disabled={readOnly || allDisabled}
            />
            <EmailRow
              emailType="awaiting_payment"
              labelKey="awaiting_payment"
              descriptionKey="attendee_awaiting_payment_email_description"
              isDisabled={disableAwaitingPayment}
              onToggle={handleIndividualToggle}
              testId="disable-attendee-awaiting-payment-email"
              disabled={readOnly || allDisabled}
            />
            <EmailRow
              emailType="reschedule_request"
              labelKey="reschedule_request"
              descriptionKey="attendee_reschedule_request_email_description"
              isDisabled={disableRescheduleRequest}
              onToggle={handleIndividualToggle}
              testId="disable-attendee-reschedule-request-email"
              disabled={readOnly || allDisabled}
            />
            <EmailRow
              emailType="location_change"
              labelKey="location_change"
              descriptionKey="attendee_location_change_email_description"
              isDisabled={disableLocationChange}
              onToggle={handleIndividualToggle}
              testId="disable-attendee-location-change-email"
              disabled={readOnly || allDisabled}
            />
            <EmailRow
              emailType="new_event"
              labelKey="guest_added"
              descriptionKey="attendee_new_event_email_description"
              isDisabled={disableNewEvent}
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
