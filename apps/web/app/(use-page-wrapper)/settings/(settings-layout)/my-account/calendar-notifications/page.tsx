import { _generateMetadata } from "app/_utils";

import CalendarNotificationsView from "~/settings/my-account/calendar-notifications-view";

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => t("calendar_notifications"),
    (t) => t("calendar_notifications_description"),
    undefined,
    undefined,
    "/settings/my-account/calendar-notifications"
  );

const Page = () => {
  return <CalendarNotificationsView />;
};

export default Page;
