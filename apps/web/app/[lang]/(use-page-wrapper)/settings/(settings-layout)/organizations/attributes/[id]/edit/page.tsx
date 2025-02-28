import { PageProps } from "app/_types";
import { _generateMetadata, getTranslate } from "app/_utils";

import OrgAttributesEditPage from "@calcom/ee/organizations/pages/settings/attributes/attributes-edit-view";

export const generateMetadata = async ({ params }: PageProps) => {
  const t = await getTranslate(params.lang as string);
  return await _generateMetadata(t("attribute"), t("edit_attribute_description"));
};

const OrgAttributesEditPageWrapper = async () => {
  return <OrgAttributesEditPage />;
};

export default OrgAttributesEditPageWrapper;
