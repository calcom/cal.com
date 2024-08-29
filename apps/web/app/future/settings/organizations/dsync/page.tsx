import { _generateMetadata } from "app/_utils";
import { WithLayout } from "app/layoutHOC";

import DirectorySyncTeamView from "@calcom/features/ee/dsync/page/team-dsync-view";
import { getLayout } from "@calcom/features/settings/layouts/SettingsLayoutAppDir";

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => t("directory_sync"),
    (t) => t("directory_sync_description")
  );

export default WithLayout({ Page: DirectorySyncTeamView, getLayout });
