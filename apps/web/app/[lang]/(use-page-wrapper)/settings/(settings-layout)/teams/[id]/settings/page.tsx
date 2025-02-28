import { PageProps } from "app/_types";
import { _generateMetadata, getTranslate } from "app/_utils";

import TeamSettingsView from "@calcom/features/ee/teams/pages/team-settings-view";
import SettingsHeader from "@calcom/features/settings/appDir/SettingsHeader";

export const generateMetadata = async ({ params }: PageProps) => {
  const t = await getTranslate(params.lang as string);
  return await _generateMetadata(t("settings"), t("team_settings_description"));
};

const Page = async ({ params }: PageProps) => {
  const t = await getTranslate(params.lang as string);
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
