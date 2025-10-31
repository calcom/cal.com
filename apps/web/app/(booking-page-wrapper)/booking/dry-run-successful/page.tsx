import { _generateMetadata } from "app/_utils";

import BookingDryRunSuccessView from "~/bookings/views/booking-dry-run-success-view";

export const generateMetadata = async () => {
  return await _generateMetadata(
    (t) => t("booking_dry_run_successful"),
    (t) => t("booking_dry_run_successful_description"),
    undefined,
    undefined,
    "/booking/dry-run-successful"
  );
};

const Page = async () => {
  return <BookingDryRunSuccessView />;
};

export default Page;
