import LegacyPage, { LayoutWrapper } from "@pages/settings/teams/new/index";
import { _generateMetadata } from "app/_utils";
import { WithLayout } from "app/layoutHOC";

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => t("create_new_team"),
    (t) => t("create_new_team_description")
  );

export default WithLayout({ Page: LegacyPage, getLayout: LayoutWrapper })<"P">;
