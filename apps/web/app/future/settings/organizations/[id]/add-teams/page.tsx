import { _generateMetadata } from "app/_utils";
import { WithLayout } from "app/layoutHOC";

import LegacyPage, { LayoutWrapper } from "~/settings/organizations/[id]/add-teams-view";

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => t("create_your_teams"),
    (t) => t("create_your_teams_description")
  );

export default WithLayout({
  Page: LegacyPage,
  getLayout: LayoutWrapper,
});
