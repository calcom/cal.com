import { _generateMetadata } from "app/_utils";
import { WithLayout } from "app/layoutHOC";

import AvailabilityPage from "~/availability/availability-view";

export const generateMetadata = async () => {
  return await _generateMetadata(
    (t) => t("availability"),
    (t) => t("configure_availability")
  );
};

export default WithLayout({ getLayout: null, Page: AvailabilityPage });
