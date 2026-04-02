import { _generateMetadata } from "app/_utils";
import AddNewTeamMembers, { LayoutWrapper } from "~/settings/teams/[id]/onboard-members-view";

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
    <LayoutWrapper>
      <AddNewTeamMembers />
    </LayoutWrapper>
  );
};

export default ServerPage;
