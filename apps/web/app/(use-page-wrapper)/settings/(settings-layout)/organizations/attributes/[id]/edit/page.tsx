import { _generateMetadata } from "app/_utils";

import OrgAttributesEditPage from "@calcom/ee/organizations/pages/settings/attributes/attributes-edit-view";

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => t("attribute"),
    (t) => t("edit_attribute_description")
  );

const OrgAttributesEditPageWrapper = async () => {
  return <OrgAttributesEditPage />;
};

export default OrgAttributesEditPageWrapper;
