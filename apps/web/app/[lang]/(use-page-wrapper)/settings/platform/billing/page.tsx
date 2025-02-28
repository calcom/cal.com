import type { PageProps } from "app/_types";
import { _generateMetadata, getTranslate } from "app/_utils";

import PlatformBillingUpgrade from "~/settings/platform/billing/billing-view";

export const generateMetadata = async ({ params }: PageProps) => {
  const t = await getTranslate(params.lang as string);
  return await _generateMetadata(t("platform_billing"), t("manage_billing_description"));
};

const ServerPageWrapper = () => {
  return <PlatformBillingUpgrade />;
};

export default ServerPageWrapper;
