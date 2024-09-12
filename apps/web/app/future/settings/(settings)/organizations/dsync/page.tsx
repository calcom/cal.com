import { _generateMetadata, getFixedT } from "app/_utils";
import { getServerSession } from "next-auth";

import { AUTH_OPTIONS } from "@calcom/features/auth/lib/next-auth-options";
import DirectorySyncTeamView from "@calcom/features/ee/dsync/page/team-dsync-view";
import SettingsHeader from "@calcom/features/settings/appDir/SettingsHeader";

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => t("directory_sync"),
    (t) => t("directory_sync_description")
  );

const Page = async () => {
  const session = await getServerSession(AUTH_OPTIONS);
  const t = await getFixedT(session?.user.locale || "en");

  return (
    <SettingsHeader title={t("directory_sync")} description={t("directory_sync_description")}>
      <DirectorySyncTeamView />
    </SettingsHeader>
  );
};

export default Page;
