import { _generateMetadata, getTranslate } from "app/_utils";

import LegacyPage from "@calcom/features/ee/teams/pages/team-appearance-view";
import SettingsHeader from "@calcom/features/settings/appDir/SettingsHeader";

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => t("booking_appearance"),
    (t) => t("appearance_team_description")
  );

const Page = async () => {
  const t = await getTranslate();

  return (
    <SettingsHeader
      title={t("booking_appearance")}
      description={t("appearance_team_description")}
      borderInShellHeader={false}>
      <LegacyPage />
    </SettingsHeader>
  );
};

export default Page;
