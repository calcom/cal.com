"use client";

import { Button } from "@calid/features/ui/components/button";
import { Label } from "@calid/features/ui/components/label";

import { useWebPush } from "@calcom/features/notifications/WebPushContext";
import SettingsHeader from "@calcom/features/settings/appDir/SettingsHeader";
import { useLocale } from "@calcom/lib/hooks/useLocale";

const PushNotificationsView = () => {
  const { t } = useLocale();
  const { subscribe, unsubscribe, isSubscribed, isLoading } = useWebPush();

  return (
    <SettingsHeader
      title={t("push_notifications")}
      description={t("push_notifications_description")}
      borderInShellHeader={false}>
      <div className="border-subtle flex items-center justify-between rounded-md border px-4 py-6 sm:px-6">
        <Label>{t("push_notifications")}</Label>
        <Button color="primary" onClick={isSubscribed ? unsubscribe : subscribe} disabled={isLoading}>
          {isSubscribed ? t("disable_browser_notifications") : t("allow_browser_notifications")}
        </Button>
      </div>
    </SettingsHeader>
  );
};

export default PushNotificationsView;
