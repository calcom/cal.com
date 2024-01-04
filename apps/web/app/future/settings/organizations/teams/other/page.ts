import { _generateMetadata } from "app/_utils";

import Page from "@calcom/features/ee/organizations/pages/settings/other-team-listing-view";

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => t("org_admin_other_teams"),
    (t) => t("org_admin_other_teams_description")
  );

export default Page;
