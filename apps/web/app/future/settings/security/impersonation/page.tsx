import { _generateMetadata } from "app/_utils";

import Page from "~/settings/security/impersonation-view";

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => t("impersonation"),
    (t) => t("impersonation_description")
  );

export default Page;
