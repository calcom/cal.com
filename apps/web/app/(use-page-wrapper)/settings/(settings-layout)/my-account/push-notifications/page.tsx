import { _generateMetadata } from "app/_utils";
import PushNotificationsView from "~/settings/my-account/push-notifications-view";

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => t("push_notifications"),
    (t) => t("push_notifications_description"),
    undefined,
    undefined,
    "/settings/my-account/push-notifications"
  );

const Page = () => {
  return <PushNotificationsView />;
};

export default Page;
