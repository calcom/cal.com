import { TeamEditLayout } from "@calid/features/modules/teams/components/TeamEditLayout";
import TeamSettingsView from "@calid/features/modules/teams/settings/TeamSettingsView";
import { _generateMetadata, getTranslate } from "app/_utils";

export const generateMetadata = async ({ params }: { params: Promise<{ id: string }> }) =>
  await _generateMetadata(
    (t) => t("settings"),
    (t) => t("team_settings_description"),
    undefined,
    undefined,
    `/settings/teams/${(await params).id}/settings`
  );

const Page = async ({ params }: { params: Promise<{ id: string }> }) => {
  const t = await getTranslate();
  const { id } = await params;
  const teamId = parseInt(id);
  return (
    <TeamEditLayout teamId={teamId}>
      <TeamSettingsView teamId={teamId} />
    </TeamEditLayout>
  );
};

export default Page;
