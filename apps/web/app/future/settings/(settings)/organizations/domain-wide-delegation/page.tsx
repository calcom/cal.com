import { _generateMetadata } from "app/_utils";

import Page from "@calcom/ee/organizations/pages/settings/domainWideDelegation";

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => t("domain_wide_delegation"),
    (t) => t("domain_wide_delegation_description")
  );

export default Page;
