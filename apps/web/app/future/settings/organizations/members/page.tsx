import { _generateMetadata } from "app/_utils";

import Page from "@calcom/features/ee/organizations/pages/settings/members";

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => t("organization_members"),
    (t) => t("organization_description")
  );

export default Page;
