import { _generateMetadata } from "app/_utils";
import { getTranslate } from "app/_utils";

import SettingsHeader from "@calcom/features/settings/appDir/SettingsHeader";

import BookingLimitsPage from "~/settings/my-account/booking-limits-view";
import { APP_NAME } from "@calcom/lib/constants";

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => t("bookings"),
    (t) => t("bookings_settings_description", { appName: APP_NAME })
  );

const Page = async () => {
  const t = await getTranslate();

  return (
    <SettingsHeader title={t("bookings")} description={t("bookings_settings_description", { appName: APP_NAME })}>
      <BookingLimitsPage />
    </SettingsHeader>
  );
};

export default Page;
