import { _generateMetadata } from "app/_utils";
import { WithLayout } from "app/layoutHOC";

import PlatformBillingUpgrade from "~/settings/platform/billing/billing-view";

export const generateMetadata = async () => {
  return await _generateMetadata(
    () => "Platform billing",
    () => "Manage all things billing"
  );
};

export default WithLayout({
  Page: PlatformBillingUpgrade,
});
