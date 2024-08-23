import { _generateMetadata } from "app/_utils";
import { WithLayout } from "app/layoutHOC";

import LegacyPage, { LayoutWrapper } from "~/settings/organizations/[id]/about-view";

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => t("about_your_organization"),
    (t) => t("about_your_organization_description")
  );

export default WithLayout({
  Page: LegacyPage,
  getLayout: LayoutWrapper,
});
