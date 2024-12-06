import { _generateMetadata } from "app/_utils";
import { WithLayout } from "app/layoutHOC";

import AddNewTeamMembers, { GetLayout } from "~/settings/teams/[id]/onboard-members-view";

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => t("add_team_members"),
    (t) => t("add_team_members_description")
  );

export default WithLayout({ Page: AddNewTeamMembers, getLayout: GetLayout })<"P">;
