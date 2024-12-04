import { _generateMetadata, getFixedT } from "app/_utils";

import { getServerSessionForAppDir } from "@calcom/features/auth/lib/get-server-session-for-app-dir";
import LegacyPage from "@calcom/features/ee/teams/pages/team-appearance-view";
import SettingsHeader from "@calcom/features/settings/appDir/SettingsHeader";

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => t("booking_appearance"),
    (t) => t("appearance_team_description")
  );

const Page = async () => {
  const session = await getServerSessionForAppDir();
  const t = await getFixedT(session?.user.locale || "en");

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
