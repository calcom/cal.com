import LegacyPage, { WrapperAddNewTeamsPage } from "@pages/settings/organizations/[id]/add-teams";
import { _generateMetadata } from "app/_utils";
import { WithLayout } from "app/layoutHOC";

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => t("create_your_teams"),
    (t) => t("create_your_teams_description")
  );

export default WithLayout({ Page: LegacyPage, getLayout: WrapperAddNewTeamsPage });
