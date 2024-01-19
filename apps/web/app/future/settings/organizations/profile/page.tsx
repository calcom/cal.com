import { _generateMetadata } from "app/_utils";

import Page from "@calcom/features/ee/organizations/pages/settings/profile";

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => t("profile"),
    (t) => t("profile_org_description")
  );

export default Page;
