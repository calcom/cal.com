import { _generateMetadata } from "app/_utils";

import PlatformBillingUpgrade from "~/settings/platform/billing/billing-view";

export const generateMetadata = async () => {
  return await _generateMetadata(
    (t) => t("platform_billing"),
    (t) => t("manage_billing_description")
  );
};

export default PlatformBillingUpgrade;
