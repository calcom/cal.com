import { TeamEditLayout } from "@calid/features/modules/teams/components/TeamEditLayout";
import TeamSettingsView from "@calid/features/modules/teams/settings/TeamSettingsView";
import { _generateMetadata } from "app/_utils";

export const generateMetadata = async ({ params }: { params: Promise<{ pages: string[] }> }) => {
  const teamId = (await params).id;

  return await _generateMetadata(
    (t) => `${t("team_settings")}`,
    (t) => `${t("team_settings_description")}`,
    undefined,
    undefined,
    `/settings/teams/${teamId}/settings`
  );
};

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
