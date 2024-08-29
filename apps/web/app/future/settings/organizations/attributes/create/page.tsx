import { _generateMetadata } from "app/_utils";
import { WithLayout } from "app/layoutHOC";

import Page, { getLayout } from "@calcom/ee/organizations/pages/settings/attributes/attributes-create-view";

export const generateMetadata = async () =>
  await _generateMetadata(
    () => "Attribute",
    () => "Create an attribute for your team members"
  );

export default WithLayout({ Page, getLayout });
