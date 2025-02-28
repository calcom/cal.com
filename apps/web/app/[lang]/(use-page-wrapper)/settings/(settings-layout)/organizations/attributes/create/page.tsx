import { PageProps } from "app/_types";
import { _generateMetadata, getTranslate } from "app/_utils";

import OrgAttributesCreatePage from "@calcom/ee/organizations/pages/settings/attributes/attributes-create-view";

export const generateMetadata = async ({ params }: PageProps) => {
  const t = await getTranslate(params.lang as string);
  return await _generateMetadata(t("attribute"), t("create_attribute_description"));
};

const OrgAttributesCreatePageWrapper = async () => {
  return <OrgAttributesCreatePage />;
};

export default OrgAttributesCreatePageWrapper;
