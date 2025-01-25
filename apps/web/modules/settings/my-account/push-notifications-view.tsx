"use client";

import { useWebPush } from "@calcom/features/notifications/WebPushContext";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Button } from "@calcom/ui";

const PushNotificationsView = () => {
  const { t } = useLocale();
  const { subscribe, unsubscribe, isSubscribed, isLoading } = useWebPush();

  return (
    <div className="border-subtle rounded-b-xl border-x border-b px-4 pb-10 pt-8 sm:px-6">
      <Button color="primary" onClick={isSubscribed ? unsubscribe : subscribe} disabled={isLoading}>
        {isSubscribed ? t("disable_browser_notifications") : t("allow_browser_notifications")}
      </Button>
    </div>
  );
};

export default PushNotificationsView;
