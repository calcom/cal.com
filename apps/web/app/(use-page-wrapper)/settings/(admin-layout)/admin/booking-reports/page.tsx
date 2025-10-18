import { _generateMetadata } from "app/_utils";
import { getTranslate } from "app/_utils";

import SettingsHeader from "@calcom/features/settings/appDir/SettingsHeader";

import BookingReportsView from "~/settings/admin/booking-reports-view";

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => t("booking_reports"),
    (t) => t("admin_booking_reports_description"),
    undefined,
    undefined,
    "/settings/admin/booking-reports"
  );

const Page = async () => {
  const t = await getTranslate();
  return (
    <SettingsHeader title={t("booking_reports")} description={t("admin_booking_reports_description")}>
      <BookingReportsView />
    </SettingsHeader>
  );
};

export default Page;
