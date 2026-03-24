"use client";

import { useWebPush } from "@calcom/web/modules/notifications/hooks/useWebPush";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Button } from "@coss/ui/components/button";
import { Card, CardFrameDescription, CardFrameHeader, CardFrameTitle, CardPanel } from "@coss/ui/components/card";

const PushNotificationsView = () => {
  const { t } = useLocale();
  const { subscribe, unsubscribe, isSubscribed, isLoading } = useWebPush();

  return (
    <Card>
      <CardPanel>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <CardFrameHeader className="p-0">
            <CardFrameTitle>{t("browser_notifications_title")}</CardFrameTitle>
            <CardFrameDescription>{t("browser_notifications_description")}</CardFrameDescription>
          </CardFrameHeader>
          <Button
            variant={isSubscribed ? "outline" : "default"}
            onClick={isSubscribed ? unsubscribe : subscribe}
            loading={isLoading}>
            {isSubscribed ? t("disable_browser_notifications") : t("allow_browser_notifications")}
          </Button>
        </div>
      </CardPanel>
    </Card>
  );
};

export default PushNotificationsView;
