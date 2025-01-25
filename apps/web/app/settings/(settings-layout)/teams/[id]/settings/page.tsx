import { _generateMetadata, getTranslate } from "app/_utils";

import TeamSettingsView from "@calcom/features/ee/teams/pages/team-settings-view";
import SettingsHeader from "@calcom/features/settings/appDir/SettingsHeader";

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => t("settings"),
    (t) => t("team_settings_description")
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
