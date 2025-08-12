import { _generateMetadata } from "app/_utils";

import CreateNewTeamView, { LayoutWrapper } from "~/settings/teams/new/create-new-team-view";

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => t("create_new_team"),
    (t) => t("create_new_team_description"),
    undefined,
    undefined,
    "/settings/teams/new"
  );

const ServerPage = async () => {
  return (
    <LayoutWrapper>
      <CreateNewTeamView />
    </LayoutWrapper>
  );
};

export default ServerPage;
