import type { PageProps } from "app/_types";
import { _generateMetadata, getTranslate } from "app/_utils";

import BookingDryRunSuccessView from "~/bookings/views/booking-dry-run-success-view";

export const generateMetadata = async ({ params }: PageProps) => {
  const t = await getTranslate(params.lang);
  return await _generateMetadata(
    t("booking_dry_run_successful"),
    t("booking_dry_run_successful_description")
  );
};

const Page = async () => {
  return <BookingDryRunSuccessView />;
};

export default Page;
