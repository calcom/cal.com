import { _generateMetadata } from "app/_utils";

import AddNewTeamMembers, { LayoutWrapper } from "~/settings/teams/[id]/onboard-members-view";

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => t("add_team_members"),
    (t) => t("add_team_members_description")
  );

const ServerPage = async () => {
  return (
    <LayoutWrapper>
      <AddNewTeamMembers />
    </LayoutWrapper>
  );
};

export default ServerPage;
