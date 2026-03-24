import { _generateMetadata, getTranslate } from "app/_utils";
import { AppHeader, AppHeaderContent, AppHeaderDescription } from "@coss/ui/shared/app-header";

import PushNotificationsView from "~/settings/my-account/push-notifications-view";

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => t("push_notifications"),
    (t) => t("push_notifications_description"),
    undefined,
    undefined,
    "/settings/my-account/push-notifications"
  );

const Page = async () => {
  const t = await getTranslate();

  return (
    <>
      <AppHeader>
        <AppHeaderContent title={t("push_notifications")}>
          <AppHeaderDescription>{t("push_notifications_description")}</AppHeaderDescription>
        </AppHeaderContent>
      </AppHeader>
      <PushNotificationsView />
    </>
  );
};

export default Page;
