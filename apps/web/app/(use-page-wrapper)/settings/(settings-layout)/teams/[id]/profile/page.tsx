import { TeamEditLayout } from "@calid/features/modules/teams/components/TeamEditLayout";
import TeamProfileView from "@calid/features/modules/teams/settings/TeamProfileView";

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
