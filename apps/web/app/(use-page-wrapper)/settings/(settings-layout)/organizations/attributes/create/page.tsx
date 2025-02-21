import { _generateMetadata } from "app/_utils";

import OrgAttributesCreatePage from "@calcom/ee/organizations/pages/settings/attributes/attributes-create-view";

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => t("attribute"),
    (t) => t("create_attribute_description")
  );

const OrgAttributesCreatePageWrapper = async () => {
  return <OrgAttributesCreatePage />;
};

export default OrgAttributesCreatePageWrapper;
