import { _generateMetadata, getFixedT } from "app/_utils";

import { getServerSessionForAppDir } from "@calcom/features/auth/lib/get-server-session-for-app-dir";
import LegacyPage from "@calcom/features/ee/organizations/pages/settings/other-team-members-view";
import SettingsHeader from "@calcom/features/settings/appDir/SettingsHeader";

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => t("team_members"),
    (t) => t("members_team_description")
  );

const Page = async () => {
  const session = await getServerSessionForAppDir();
  const t = await getFixedT(session?.user.locale || "en");

  return (
    // TODO: Add CTA Button
    <SettingsHeader title={t("team_members")} description={t("members_team_description")}>
      <LegacyPage isAppDir={true} />
    </SettingsHeader>
  );
};

export default Page;
