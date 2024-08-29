import { _generateMetadata } from "app/_utils";
import { WithLayout } from "app/layoutHOC";

import Page, { getLayout } from "@calcom/ee/organizations/pages/settings/attributes/attributes-edit-view";

export const generateMetadata = async () =>
  await _generateMetadata(
    () => "Attribute",
    (t) => t("edit_attribute_description")
  );

export default WithLayout({ Page, getLayout });
