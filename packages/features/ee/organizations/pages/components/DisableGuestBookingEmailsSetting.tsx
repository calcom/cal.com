"use client";

import { useState } from "react";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc";
import { Alert } from "@calcom/ui/components/alert";
import { Switch } from "@calcom/ui/components/form";
import { SettingsToggle } from "@calcom/ui/components/form";
import { showToast } from "@calcom/ui/components/toast";

interface IDisableGuestBookingEmailsSettingProps {
  orgId: number;
  settings: {
    disableGuestConfirmationEmail: boolean;
    disableGuestCancellationEmail: boolean;
    disableGuestRescheduledEmail: boolean;
    disableGuestRequestEmail: boolean;
  };
}

const DisableGuestBookingEmailsSetting = (props: IDisableGuestBookingEmailsSettingProps) => {
  const utils = trpc.useUtils();
  const { t } = useLocale();

  const [disableConfirmation, setDisableConfirmation] = useState(
    props.settings.disableGuestConfirmationEmail
  );
  const [disableCancellation, setDisableCancellation] = useState(
    props.settings.disableGuestCancellationEmail
  );
  const [disableRescheduled, setDisableRescheduled] = useState(props.settings.disableGuestRescheduledEmail);
  const [disableRequest, setDisableRequest] = useState(props.settings.disableGuestRequestEmail);

  const allDisabled = disableConfirmation && disableCancellation && disableRescheduled && disableRequest;

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

  const handleDisableAll = (checked: boolean) => {
    mutation.mutate({
      disableGuestConfirmationEmail: checked,
      disableGuestCancellationEmail: checked,
      disableGuestRescheduledEmail: checked,
      disableGuestRequestEmail: checked,
    });
    setDisableConfirmation(checked);
    setDisableCancellation(checked);
    setDisableRescheduled(checked);
    setDisableRequest(checked);
  };

  const handleIndividualToggle = (
    type: "confirmation" | "cancellation" | "rescheduled" | "request",
    checked: boolean
  ) => {
    const updates: Record<string, boolean> = {};

    switch (type) {
      case "confirmation":
        updates.disableGuestConfirmationEmail = checked;
        setDisableConfirmation(checked);
        break;
      case "cancellation":
        updates.disableGuestCancellationEmail = checked;
        setDisableCancellation(checked);
        break;
      case "rescheduled":
        updates.disableGuestRescheduledEmail = checked;
        setDisableRescheduled(checked);
        break;
      case "request":
        updates.disableGuestRequestEmail = checked;
        setDisableRequest(checked);
        break;
    }

    mutation.mutate(updates);
  };

  return (
    <div className="space-y-6">
      <Alert severity="warning">
        {t("disable_guest_emails_warning")}
      </Alert>

      <SettingsToggle
        toggleSwitchAtTheEnd={true}
        checked={allDisabled}
        title={t("disable_all_booking_emails_to_guests")}
        labelClassName="text-sm font-semibold"
        description={t("disable_all_booking_emails_to_guests_description")}
        switchContainerClassName="border-subtle rounded-lg border py-6 px-4 sm:px-6"
        data-testid="disable-all-guest-emails"
        onCheckedChange={handleDisableAll}
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
            <tr>
              <td className="text-default px-6 py-4 text-sm font-medium">{t("confirmation")}</td>
              <td className="text-muted px-6 py-4 text-sm">{t("guest_confirmation_email_description")}</td>
              <td className="px-6 py-4 text-right">
                <Switch
                  checked={disableConfirmation}
                  onCheckedChange={(checked) => handleIndividualToggle("confirmation", checked)}
                  data-testid="disable-guest-confirmation-email"
                />
              </td>
            </tr>
            <tr>
              <td className="text-default px-6 py-4 text-sm font-medium">{t("cancellation")}</td>
              <td className="text-muted px-6 py-4 text-sm">{t("guest_cancellation_email_description")}</td>
              <td className="px-6 py-4 text-right">
                <Switch
                  checked={disableCancellation}
                  onCheckedChange={(checked) => handleIndividualToggle("cancellation", checked)}
                  data-testid="disable-guest-cancellation-email"
                />
              </td>
            </tr>
            <tr>
              <td className="text-default px-6 py-4 text-sm font-medium">{t("rescheduled")}</td>
              <td className="text-muted px-6 py-4 text-sm">{t("guest_rescheduled_email_description")}</td>
              <td className="px-6 py-4 text-right">
                <Switch
                  checked={disableRescheduled}
                  onCheckedChange={(checked) => handleIndividualToggle("rescheduled", checked)}
                  data-testid="disable-guest-rescheduled-email"
                />
              </td>
            </tr>
            <tr>
              <td className="text-default px-6 py-4 text-sm font-medium">{t("request")}</td>
              <td className="text-muted px-6 py-4 text-sm">{t("guest_request_email_description")}</td>
              <td className="px-6 py-4 text-right">
                <Switch
                  checked={disableRequest}
                  onCheckedChange={(checked) => handleIndividualToggle("request", checked)}
                  data-testid="disable-guest-request-email"
                />
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default DisableGuestBookingEmailsSetting;
