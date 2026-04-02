import SettingsHeader from "@calcom/features/settings/appDir/SettingsHeader";
import TeamSettingsView from "@calcom/web/modules/ee/teams/views/team-settings-view";
import { _generateMetadata, getTranslate } from "app/_utils";

export const generateMetadata = async ({ params }: { params: Promise<{ id: string }> }) =>
  await _generateMetadata(
    (t) => t("settings"),
    (t) => t("team_settings_description"),
    undefined,
    undefined,
    `/settings/teams/${(await params).id}/settings`
  );

const Page = async () => {
  const t = await getTranslate();
  return (
    <SettingsHeader
      title={t("settings")}
      description={t("team_settings_description")}
      borderInShellHeader={false}>
      <TeamSettingsView />
    </SettingsHeader>
  );
};

export default Page;
