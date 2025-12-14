import { TeamEditLayout } from "@calid/features/modules/teams/components/TeamEditLayout";
import TeamProfileView from "@calid/features/modules/teams/settings/TeamProfileView";
import { _generateMetadata } from "app/_utils";

export const generateMetadata = async ({ params }: { params: Promise<{ pages: string[] }> }) => {
  const teamId = (await params).id;

  return await _generateMetadata(
    (t) => `${t("team_profile")}`,
    (t) => `${t("manage_team_profile")}`,
    undefined,
    undefined,
    `/settings/teams/${teamId}/profile`
  );
};

const Page = async ({ params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  const teamId = parseInt(id);

  return (
    <TeamEditLayout teamId={teamId}>
      <TeamProfileView teamId={Number(teamId)} />
    </TeamEditLayout>
  );
};

export default Page;
