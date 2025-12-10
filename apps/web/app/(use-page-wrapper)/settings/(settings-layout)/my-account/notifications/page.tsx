import { _generateMetadata } from "app/_utils";

import NotificationsView from "~/settings/my-account/notifications-view";

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => t("notifications"),
    (t) => t("notifications_description"),
    undefined,
    undefined,
    "/settings/my-account/notifications"
  );

const Page = () => {
  return <NotificationsView />;
};

export default Page;

