import CreateTeamWrapper from "@calid/features/modules/teams/components/CreateTeamWrapper";
import AddTeamMembers from "@calid/features/modules/teams/pages/AddTeamMembers";
import { _generateMetadata } from "app/_utils";

export const generateMetadata = async ({ params }: { params: Promise<{ id: string }> }) =>
  await _generateMetadata(
    (t) => t("add_team_members"),
    (t) => t("add_team_members_description"),
    undefined,
    undefined,
    `/settings/teams/${(await params).id}/onboard-members`
  );

const ServerPage = async () => {
  return (
    <CreateTeamWrapper>
      <AddTeamMembers />
    </CreateTeamWrapper>
  );
};

export default ServerPage;
