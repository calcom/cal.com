import { _generateMetadata } from "_app/_utils";

import Page from "@calcom/features/ee/organizations/pages/settings/admin/AdminOrgPage";

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => t("organizations"),
    (t) => t("orgs_page_description")
  );

export default Page;
