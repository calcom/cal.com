import { PageProps } from "app/_types";
import { _generateMetadata, getTranslate } from "app/_utils";

import DirectorySyncTeamView from "@calcom/features/ee/dsync/page/team-dsync-view";
import SettingsHeader from "@calcom/features/settings/appDir/SettingsHeader";

export const generateMetadata = async ({ params }: PageProps) => {
  const t = await getTranslate(params.lang as string);
  return await _generateMetadata(t("directory_sync"), t("directory_sync_description"));
};

const Page = async ({ params }: PageProps) => {
  const t = await getTranslate(params.lang as string);

  return (
    <SettingsHeader title={t("directory_sync")} description={t("directory_sync_description")}>
      <DirectorySyncTeamView />
    </SettingsHeader>
  );
};

export default Page;
