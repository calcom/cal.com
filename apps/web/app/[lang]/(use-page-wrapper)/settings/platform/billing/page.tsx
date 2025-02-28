import { _generateMetadata } from "app/_utils";

import PlatformBillingUpgrade from "~/settings/platform/billing/billing-view";

export const generateMetadata = async ({params}: PageProps) => {
  return await _generateMetadata(
     t("platform_billing"),
     t("manage_billing_description")
  );
};

const ServerPageWrapper = () => {
  return <PlatformBillingUpgrade />;
};

export default ServerPageWrapper;
