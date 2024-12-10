import { _generateMetadata } from "app/_utils";
import { WithLayout } from "app/layoutHOC";

import CreateNewTeamView, { LayoutWrapper } from "~/settings/teams/new/create-new-team-view";

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => t("create_new_team"),
    (t) => t("create_new_team_description")
  );

export default WithLayout({ Page: CreateNewTeamView, getLayout: LayoutWrapper })<"P">;
