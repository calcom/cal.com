import { TeamEditLayout } from "@calid/features/teams/TeamEditLayout";
// import TeamSettingsView from "@calcom/features/ee/teams/pages/team-settings-view";
import TeamSettingsView from "@calid/features/teams/TeamSettingsView";
import { _generateMetadata, getTranslate } from "app/_utils";

import SettingsHeader from "@calcom/features/settings/appDir/SettingsHeader";

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
      <TeamSettingsView />
    </TeamEditLayout>
  );
};

export default Page;
