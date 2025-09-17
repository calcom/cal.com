import { _generateMetadata } from "app/_utils";

import OrgAttributesCreatePage from "@calcom/ee/organizations/pages/settings/attributes/attributes-create-view";

import { validateUserHasOrgAdmin } from "../../../actions/validateUserHasOrgAdmin";

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => t("attribute"),
    (t) => t("create_attribute_description"),
    undefined,
    undefined,
    "/settings/organizations/attributes/create"
  );

const OrgAttributesCreatePageWrapper = async () => {
  await validateUserHasOrgAdmin();

  return <OrgAttributesCreatePage />;
};

export default OrgAttributesCreatePageWrapper;
