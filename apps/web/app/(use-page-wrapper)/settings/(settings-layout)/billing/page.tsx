import { _generateMetadata } from "app/_utils";

import BillingView from "~/settings/billing/billing-view";

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => t("billing"),
    (t) => t("manage_billing_description")
  );

const Page = () => {
  return <BillingView />;
};

export default Page;
