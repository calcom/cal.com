import { _generateMetadata, getTranslate } from "app/_utils";

import DirectorySyncTeamView from "@calcom/features/ee/dsync/page/team-dsync-view";
import SettingsHeader from "@calcom/features/settings/appDir/SettingsHeader";

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => t("directory_sync"),
    (t) => t("directory_sync_description")
  );

const Page = async () => {
  const t = await getTranslate();

  return (
    <SettingsHeader title={t("directory_sync")} description={t("directory_sync_description")}>
      <DirectorySyncTeamView />
    </SettingsHeader>
  );
};

export default Page;
