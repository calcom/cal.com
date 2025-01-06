import { _generateMetadata } from "app/_utils";
import { WithLayout } from "app/layoutHOC";

import BookingDryRunSuccessView from "~/bookings/views/booking-dry-run-success-view";

export const generateMetadata = async () => {
  return await _generateMetadata(
    (t) => t("booking_dry_run_successful"),
    (t) => t("booking_dry_run_successful_description")
  );
};

const Page = async () => {
  return <BookingDryRunSuccessView />;
};

export default WithLayout({ ServerPage: Page });
