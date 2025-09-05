import { TeamEditLayout } from "@calid/features/modules/teams/components/TeamEditLayout";
import TeamAppearanceView from "@calid/features/modules/teams/settings/TeamAppearanceView";

const Page = async ({ params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  const teamId = parseInt(id);

  return (
    <TeamEditLayout teamId={teamId}>
      <TeamAppearanceView teamId={teamId} />
    </TeamEditLayout>
  );
};

export default Page;
