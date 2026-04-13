"use client";

import { EmailType } from "@calcom/emails/email-types";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { Alert, AlertDescription } from "@coss/ui/components/alert";
import {
  AlertDialog,
  AlertDialogClose,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogPopup,
  AlertDialogTitle,
} from "@coss/ui/components/alert-dialog";
import { Button } from "@coss/ui/components/button";
import { CardFrame } from "@coss/ui/components/card";
import { Checkbox } from "@coss/ui/components/checkbox";
import { Label } from "@coss/ui/components/label";
import { Skeleton } from "@coss/ui/components/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@coss/ui/components/table";
import { toastManager } from "@coss/ui/components/toast";
import { TriangleAlertIcon } from "@coss/ui/icons";
import { SettingsToggle } from "@coss/ui/shared/settings-toggle";
import { useState } from "react";

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

const checkboxSkeletonClassName = "inline-flex size-4.5 shrink-0 rounded-[.25rem] sm:size-4";

interface EmailRowProps {
  emailType: EmailType;
  labelKey: string;
  descriptionKey: string;
  isDisabled: boolean;
  onToggle: (type: EmailType, disabled: boolean) => void;
  testId: string;
  disabled?: boolean;
  isLoading?: boolean;
}

const EmailRow = ({
  emailType,
  labelKey,
  descriptionKey,
  isDisabled,
  onToggle,
  testId,
  disabled,
  isLoading = false,
}: EmailRowProps) => {
  const { t } = useLocale();

  return (
    <TableRow>
      <TableCell className="font-medium">{t(labelKey)}</TableCell>
      <TableCell className="whitespace-normal text-muted-foreground leading-tight">
        {t(descriptionKey)}
      </TableCell>
      <TableCell className="text-right">
        {isLoading ? (
          <div className="flex justify-end">
            <Skeleton aria-hidden="true" className={checkboxSkeletonClassName} />
          </div>
        ) : (
          <Label>
            <Checkbox
              checked={!isDisabled}
              onCheckedChange={(checked) => onToggle(emailType, checked !== true)}
              aria-label={t(labelKey)}
              data-testid={testId}
              disabled={disabled}
            />
          </Label>
        )}
      </TableCell>
    </TableRow>
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
    disableAttendeeCalVideoRecordingEmail: boolean;
  };
  readOnly?: boolean;
  /** When true, shows skeletons on the master toggle and row checkboxes only. */
  isLoading?: boolean;
}

export const DEFAULT_GUEST_EMAIL_SETTINGS: IDisableGuestBookingEmailsSettingProps["settings"] = {
  disableAttendeeConfirmationEmail: false,
  disableAttendeeCancellationEmail: false,
  disableAttendeeRescheduledEmail: false,
  disableAttendeeRequestEmail: false,
  disableAttendeeReassignedEmail: false,
  disableAttendeeAwaitingPaymentEmail: false,
  disableAttendeeRescheduleRequestEmail: false,
  disableAttendeeLocationChangeEmail: false,
  disableAttendeeNewEventEmail: false,
  disableAttendeeCalVideoRecordingEmail: false,
};

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
  const { readOnly = false, isLoading = false } = props;
  const utils = trpc.useUtils();
  const { t } = useLocale();

  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [dialogAction, setDialogAction] = useState<"enable" | "disable">("disable");
  const [dialogMode, setDialogMode] = useState<"all" | "individual">("all");
  const [pendingEmailType, setPendingEmailType] = useState<EmailType | null>(null);
  const [calVideoRecordingPending, setCalVideoRecordingPending] = useState(false);

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

  const [calVideoRecordingEmailDisabled, setCalVideoRecordingEmailDisabled] = useState(
    props.settings.disableAttendeeCalVideoRecordingEmail
  );

  const allDisabled = Object.values(emailSettings).every(Boolean) && calVideoRecordingEmailDisabled;

  const resetPendingDialogState = () => {
    setCalVideoRecordingPending(false);
    setPendingEmailType(null);
  };

  const mutation = trpc.viewer.organizations.update.useMutation({
    onSuccess: async () => {
      toastManager.add({ title: t("your_org_updated_successfully"), type: "success" });
    },
    onError: () => {
      toastManager.add({ title: t("error_updating_settings"), type: "error" });
    },
    onSettled: () => {
      utils.viewer.organizations.listCurrent.invalidate();
    },
  });

  const handleDisableAll = (disable: boolean) => {
    const apiPayload = {
      ...Object.fromEntries(Object.values(EMAIL_TYPE_TO_SETTING_KEY).map((key) => [key, disable])),
      disableAttendeeCalVideoRecordingEmail: disable,
    };
    mutation.mutate(apiPayload);

    setEmailSettings(
      Object.fromEntries(Object.values(EmailType).map((type) => [type, disable])) as EmailSettings
    );
    setCalVideoRecordingEmailDisabled(disable);
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
    if (calVideoRecordingPending) {
      const shouldDisable = dialogAction === "disable";
      mutation.mutate({ disableAttendeeCalVideoRecordingEmail: shouldDisable });
      setCalVideoRecordingEmailDisabled(shouldDisable);
      setCalVideoRecordingPending(false);
      return;
    }
    if (pendingEmailType === null) return;
    const settingKey = EMAIL_TYPE_TO_SETTING_KEY[pendingEmailType];
    const shouldDisable = dialogAction === "disable";
    mutation.mutate({ [settingKey]: shouldDisable });
    setEmailSettings((prev) => ({ ...prev, [pendingEmailType]: shouldDisable }));
    setPendingEmailType(null);
  };

  let individualEmailLabel = "";
  if (calVideoRecordingPending) {
    individualEmailLabel = t("cal_video_recording");
  } else if (pendingEmailType) {
    individualEmailLabel = t(EMAIL_TYPE_LABELS[pendingEmailType]);
  }

  let confirmDialogTitle: string;
  let confirmDialogDescription: string;
  let confirmDialogActionLabel: string;

  if (dialogMode === "all") {
    if (dialogAction === "disable") {
      confirmDialogTitle = t("disable_all_guest_booking_emails_confirm_title");
      confirmDialogDescription = t("disable_all_guest_booking_emails_confirm_description");
      confirmDialogActionLabel = t("disable_all");
    } else {
      confirmDialogTitle = t("enable_all_guest_booking_emails_confirm_title");
      confirmDialogDescription = t("enable_all_guest_booking_emails_confirm_description");
      confirmDialogActionLabel = t("enable_all");
    }
  } else {
    confirmDialogTitle = t("disable_individual_guest_email_confirm_title", {
      emailType: individualEmailLabel,
    });
    confirmDialogDescription = t("disable_individual_guest_email_confirm_description", {
      emailType: individualEmailLabel,
    });
    confirmDialogActionLabel = t("disable_email");
  }

  const handleConfirmDialog = () => {
    if (dialogMode === "all") {
      handleDisableAll(dialogAction === "disable");
    } else {
      confirmIndividualToggle();
    }
    resetPendingDialogState();
    setShowConfirmDialog(false);
  };

  return (
    <div className="flex flex-col gap-6">
      <AlertDialog
        open={showConfirmDialog}
        onOpenChange={setShowConfirmDialog}
        onOpenChangeComplete={(open) => {
          if (!open) {
            resetPendingDialogState();
          }
        }}>
        <AlertDialogPopup>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirmDialogTitle}</AlertDialogTitle>
            <AlertDialogDescription>{confirmDialogDescription}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogClose disabled={mutation.isPending} render={<Button variant="ghost" />}>
              {t("cancel")}
            </AlertDialogClose>
            <Button
              data-testid="dialog-confirmation"
              loading={mutation.isPending}
              variant={dialogAction === "disable" ? "destructive" : "default"}
              onClick={handleConfirmDialog}>
              {confirmDialogActionLabel}
            </Button>
          </AlertDialogFooter>
        </AlertDialogPopup>
      </AlertDialog>

      <Alert variant="warning" data-testid="alert">
        <TriangleAlertIcon aria-hidden="true" />
        <AlertDescription>{t("disable_guest_emails_warning")}</AlertDescription>
      </Alert>

      <div data-testid="disable-all-guest-emails">
        <SettingsToggle
          checked={allDisabled}
          description={t("disable_all_booking_emails_to_guests_description")}
          disabled={readOnly || isLoading}
          loading={isLoading}
          title={t("disable_all_booking_emails_to_guests")}
          onCheckedChange={(checked) => {
            setDialogAction(checked ? "disable" : "enable");
            setDialogMode("all");
            setShowConfirmDialog(true);
          }}
        />
      </div>

      <CardFrame>
        <Table variant="card">
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>{t("email_type")}</TableHead>
              <TableHead>{t("description")}</TableHead>
              <TableHead className="text-right">{t("enabled")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <EmailRow
              emailType={EmailType.CONFIRMATION}
              labelKey="confirmation"
              descriptionKey="guest_confirmation_email_description"
              isDisabled={emailSettings[EmailType.CONFIRMATION]}
              onToggle={handleIndividualToggle}
              testId="disable-guest-confirmation-email"
              disabled={readOnly || allDisabled}
              isLoading={isLoading}
            />
            <EmailRow
              emailType={EmailType.CANCELLATION}
              labelKey="cancellation"
              descriptionKey="guest_cancellation_email_description"
              isDisabled={emailSettings[EmailType.CANCELLATION]}
              onToggle={handleIndividualToggle}
              testId="disable-guest-cancellation-email"
              disabled={readOnly || allDisabled}
              isLoading={isLoading}
            />
            <EmailRow
              emailType={EmailType.RESCHEDULED}
              labelKey="rescheduled"
              descriptionKey="guest_rescheduled_email_description"
              isDisabled={emailSettings[EmailType.RESCHEDULED]}
              onToggle={handleIndividualToggle}
              testId="disable-guest-rescheduled-email"
              disabled={readOnly || allDisabled}
              isLoading={isLoading}
            />
            <EmailRow
              emailType={EmailType.REQUEST}
              labelKey="request"
              descriptionKey="attendee_request_email_description"
              isDisabled={emailSettings[EmailType.REQUEST]}
              onToggle={handleIndividualToggle}
              testId="disable-attendee-request-email"
              disabled={readOnly || allDisabled}
              isLoading={isLoading}
            />
            <EmailRow
              emailType={EmailType.REASSIGNED}
              labelKey="host_reassignment"
              descriptionKey="attendee_reassigned_email_description"
              isDisabled={emailSettings[EmailType.REASSIGNED]}
              onToggle={handleIndividualToggle}
              testId="disable-attendee-reassigned-email"
              disabled={readOnly || allDisabled}
              isLoading={isLoading}
            />
            <EmailRow
              emailType={EmailType.AWAITING_PAYMENT}
              labelKey="awaiting_payment"
              descriptionKey="attendee_awaiting_payment_email_description"
              isDisabled={emailSettings[EmailType.AWAITING_PAYMENT]}
              onToggle={handleIndividualToggle}
              testId="disable-attendee-awaiting-payment-email"
              disabled={readOnly || allDisabled}
              isLoading={isLoading}
            />
            <EmailRow
              emailType={EmailType.RESCHEDULE_REQUEST}
              labelKey="reschedule_request"
              descriptionKey="attendee_reschedule_request_email_description"
              isDisabled={emailSettings[EmailType.RESCHEDULE_REQUEST]}
              onToggle={handleIndividualToggle}
              testId="disable-attendee-reschedule-request-email"
              disabled={readOnly || allDisabled}
              isLoading={isLoading}
            />
            <EmailRow
              emailType={EmailType.LOCATION_CHANGE}
              labelKey="location_change"
              descriptionKey="attendee_location_change_email_description"
              isDisabled={emailSettings[EmailType.LOCATION_CHANGE]}
              onToggle={handleIndividualToggle}
              testId="disable-attendee-location-change-email"
              disabled={readOnly || allDisabled}
              isLoading={isLoading}
            />
            <EmailRow
              emailType={EmailType.NEW_EVENT}
              labelKey="guest_added"
              descriptionKey="attendee_new_event_email_description"
              isDisabled={emailSettings[EmailType.NEW_EVENT]}
              onToggle={handleIndividualToggle}
              testId="disable-attendee-new-event-email"
              disabled={readOnly || allDisabled}
              isLoading={isLoading}
            />
            <TableRow>
              <TableCell className="font-medium">{t("cal_video_recording")}</TableCell>
              <TableCell className="whitespace-normal text-muted-foreground leading-tight">
                {t("cal_video_recording_email_description")}
              </TableCell>
              <TableCell className="text-right">
                {isLoading ? (
                  <div className="flex justify-end">
                    <Skeleton aria-hidden="true" className={checkboxSkeletonClassName} />
                  </div>
                ) : (
                  <Label>
                    <Checkbox
                      checked={!calVideoRecordingEmailDisabled}
                      onCheckedChange={(checked) => {
                        const disable = checked !== true;
                        if (disable) {
                          setPendingEmailType(null);
                          setDialogAction("disable");
                          setDialogMode("individual");
                          setShowConfirmDialog(true);
                          setCalVideoRecordingPending(true);
                        } else {
                          mutation.mutate({ disableAttendeeCalVideoRecordingEmail: false });
                          setCalVideoRecordingEmailDisabled(false);
                        }
                      }}
                      aria-label={t("cal_video_recording")}
                      data-testid="disable-cal-video-recording-email"
                      disabled={readOnly || allDisabled}
                    />
                  </Label>
                )}
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </CardFrame>
    </div>
  );
};

export default DisableGuestBookingEmailsSetting;
