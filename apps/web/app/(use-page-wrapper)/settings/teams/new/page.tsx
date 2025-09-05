import CreateTeamWrapper from "@calid/features/modules/teams/components/CreateTeamWrapper";
import CreateNewTeamPage from "@calid/features/modules/teams/pages/CreateNewTeam";
import { _generateMetadata } from "app/_utils";

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => t("create_a_new_team"),
    (t) => t("create_a_new_team_description"),
    undefined,
    undefined,
    "/settings/teams/new"
  );

const ServerPage = async () => {
  return (
    <CreateTeamWrapper>
      <CreateNewTeamPage />
    </CreateTeamWrapper>
  );
};

export default ServerPage;
