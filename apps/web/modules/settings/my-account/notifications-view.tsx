"use client";

import { useWebPush } from "@calcom/features/notifications/WebPushContext";
import SettingsHeader from "@calcom/features/settings/appDir/SettingsHeader";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Button } from "@calcom/ui/components/button";
import { NotificationPreferencesWrapper } from "./components/NotificationPreferencesWrapper";
import type { NotificationPreferenceData } from "./components/NotificationPreferencesTable";

interface NotificationsViewProps {
  preferences: NotificationPreferenceData[];
}

const NotificationsView = ({ preferences }: NotificationsViewProps) => {
  const { t } = useLocale();
  const { subscribe, unsubscribe, isSubscribed, isLoading } = useWebPush();

  const handlePreferenceChange = (
    notificationType: string,
    channel: string,
    enabled: boolean
  ) => {
    // TODO: Implement API call to update preference
  };

  return (
    <SettingsHeader
      title={t("notifications")}
      description={t("notifications_description")}
      borderInShellHeader={true}>
      <div className="border-subtle rounded-b-xl border-x border-b px-4 pb-10 pt-8 sm:px-6">
        <div className="mb-8">
          <h3 className="text-lg font-semibold mb-2">{t("browser_notifications")}</h3>
          <Button color="primary" onClick={isSubscribed ? unsubscribe : subscribe} disabled={isLoading}>
            {isSubscribed ? t("disable_browser_notifications") : t("allow_browser_notifications")}
          </Button>
        </div>

        <div>
          <h3 className="text-lg font-semibold mb-4">{t("notification_preferences")}</h3>
          <NotificationPreferencesWrapper
            preferences={preferences}
            onPreferenceChange={handlePreferenceChange}
          />
        </div>
      </div>
    </SettingsHeader>
  );
};

export default NotificationsView;

