import { TeamEditLayout } from "@calid/features/modules/teams/components/TeamEditLayout";
import TeamMembersView from "@calid/features/modules/teams/settings/TeamMembersView";

// import MembersView from "@calcom/features/ee/teams/pages/team-members-view";

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
