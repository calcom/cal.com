import { TeamEditLayout } from "@calid/features/modules/teams/components/TeamEditLayout";
import TeamSettingsView from "@calid/features/modules/teams/settings/TeamSettingsView";

const Page = async ({ params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  const teamId = parseInt(id);
  return (
    <TeamEditLayout teamId={teamId}>
      <TeamSettingsView teamId={teamId} />
    </TeamEditLayout>
  );
};

export default Page;
