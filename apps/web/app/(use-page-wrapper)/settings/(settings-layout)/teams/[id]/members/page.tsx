import { TeamEditLayout } from "@calid/features/modules/teams/components/TeamEditLayout";
import TeamMembersView from "@calid/features/modules/teams/settings/TeamMembersView";

// import MembersView from "@calcom/features/ee/teams/pages/team-members-view";

import { _generateMetadata } from "app/_utils";

export const generateMetadata = async ({ params }: { params: Promise<{ pages: string[] }> }) => {
  const teamId = (await params).id;

  return await _generateMetadata(
    (t) => `${t("team_members")}`,
    (t) => `${t("manage_team_members")}`,
    undefined,
    undefined,
    `/settings/teams/${teamId}/members`
  );
};


const Page = async ({ params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  const teamId = parseInt(id);

  return (
    <TeamEditLayout teamId={teamId}>
      <TeamMembersView teamId={teamId} />
    </TeamEditLayout>
  );
};

export default Page;
