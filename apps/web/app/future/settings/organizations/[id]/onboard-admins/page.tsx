import { _generateMetadata } from "app/_utils";
import { WithLayout } from "app/layoutHOC";

import LegacyPage, { LayoutWrapper } from "~/settings/organizations/[id]/onboard-members-view";

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => t("invite_organization_admins"),
    (t) => t("invite_organization_admins_description")
  );

export default WithLayout({
  Page: LegacyPage,
  getLayout: LayoutWrapper,
});
