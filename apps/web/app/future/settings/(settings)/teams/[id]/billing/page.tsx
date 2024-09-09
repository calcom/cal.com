import { _generateMetadata } from "app/_utils";

import Page from "~/settings/billing/billing-view";

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => t("billing"),
    (t) => t("team_billing_description")
  );

export default Page;
