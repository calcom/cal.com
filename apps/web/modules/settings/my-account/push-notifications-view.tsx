"use client";

import { useWebPush } from "@calcom/features/notifications/WebPushContext";
import SettingsHeader from "@calcom/features/settings/appDir/SettingsHeader";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { Button } from "@calcom/ui/components/button";
import { showToast } from "@calcom/ui/components/toast";

type HostEmailType =
  | "disableHostConfirmationEmail"
  | "disableHostRescheduledEmail"
  | "disableHostCancellationEmail"
  | "disableHostLocationChangeEmail"
  | "disableHostRequestEmail";

const HOST_EMAIL_SETTINGS: { key: HostEmailType; labelKey: string }[] = [
  { key: "disableHostConfirmationEmail", labelKey: "host_confirmation_email_description" },
  { key: "disableHostRescheduledEmail", labelKey: "host_rescheduled_email_description" },
  { key: "disableHostCancellationEmail", labelKey: "host_cancellation_email_description" },
  { key: "disableHostLocationChangeEmail", labelKey: "host_location_change_email_description" },
  { key: "disableHostRequestEmail", labelKey: "host_request_email_description" },
];

function NotificationsView(): React.JSX.Element {
  const { t } = useLocale();
  const { subscribe, unsubscribe, isSubscribed, isLoading: isPushLoading } = useWebPush();

  const utils = trpc.useUtils();
  const { data: user, isLoading: isUserLoading } = trpc.viewer.me.useQuery();
  const updateProfile = trpc.viewer.updateProfile.useMutation({
    onSuccess: () => {
      utils.viewer.me.invalidate();
      showToast(t("settings_updated_successfully"), "success");
    },
    onError: () => {
      showToast(t("error_updating_settings"), "error");
    },
  });

  const handleToggle = (key: HostEmailType) => {
    if (!user) return;
    const currentValue = user[key] ?? false;
    updateProfile.mutate({ [key]: !currentValue });
  };

  const isLoading = isUserLoading || updateProfile.isPending;

  return (
    <SettingsHeader
      title={t("notifications")}
      description={t("notifications_description")}
      borderInShellHeader={true}>
      <div className="border-subtle rounded-b-xl border-x border-b">
        {/* Browser Push Notifications Section */}
        <div className="border-subtle border-b px-4 py-6 sm:px-6">
          <h3 className="text-emphasis text-base font-semibold">{t("browser_notifications")}</h3>
          <p className="text-subtle mt-1 text-sm">{t("push_notifications_description")}</p>
          <div className="mt-4">
            <Button color="primary" onClick={isSubscribed ? unsubscribe : subscribe} disabled={isPushLoading}>
              {isSubscribed ? t("disable_browser_notifications") : t("allow_browser_notifications")}
            </Button>
          </div>
        </div>

        {/* Host Email Notifications Section */}
        <div className="px-4 py-6 sm:px-6">
          <h3 className="text-emphasis text-base font-semibold">{t("host_email_notifications")}</h3>
          <p className="text-subtle mt-1 text-sm">{t("host_email_notifications_description")}</p>
          <div className="mt-6">
            <table className="w-full">
              <thead>
                <tr className="border-subtle border-b">
                  <th className="text-subtle pb-3 text-left text-sm font-medium">{t("email_type")}</th>
                  <th className="text-subtle pb-3 text-right text-sm font-medium">{t("enabled")}</th>
                </tr>
              </thead>
              <tbody>
                {HOST_EMAIL_SETTINGS.map(({ key, labelKey }) => {
                  const isDisabled = user?.[key] ?? false;
                  return (
                    <tr key={key} className="border-subtle border-b last:border-b-0">
                      <td className="text-default py-4 text-sm">{t(labelKey)}</td>
                      <td className="py-4 text-right">
                        <button
                          type="button"
                          role="switch"
                          aria-checked={!isDisabled}
                          disabled={isLoading}
                          onClick={() => handleToggle(key)}
                          className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${
                            !isDisabled ? "bg-emphasis" : "bg-muted"
                          }`}>
                          <span
                            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-default shadow ring-0 transition duration-200 ease-in-out ${
                              !isDisabled ? "translate-x-5" : "translate-x-0"
                            }`}
                          />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </SettingsHeader>
  );
}

export default NotificationsView;
