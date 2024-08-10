import { _generateMetadata } from "app/_utils";

import OrgEditView from "@calcom/features/ee/organizations/pages/settings/admin/AdminOrgEditPage";

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => t("organizations"),
    (t) => t("orgs_page_description")
  );

export default OrgEditView;
