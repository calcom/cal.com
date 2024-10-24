import { _generateMetadata } from "app/_utils";

import Page from "@calcom/ee/organizations/pages/settings/attributes/attributes-edit-view";

export const generateMetadata = async () =>
  await _generateMetadata(
    () => "Attribute",
    (t) => t("edit_attribute_description")
  );

export default Page;
