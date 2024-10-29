import { _generateMetadata, getFixedT } from "app/_utils";

import { getServerSessionForAppDir } from "@calcom/features/auth/lib/get-server-session-for-app-dir";
import { FlagListingView } from "@calcom/features/flags/pages/flag-listing-view";
import SettingsHeader from "@calcom/features/settings/appDir/SettingsHeader";

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => t("feature_flags"),
    (t) => t("admin_flags_description")
  );

const Page = async () => {
  const session = await getServerSessionForAppDir();
  const t = await getFixedT(session?.user.locale || "en");
  return (
    <SettingsHeader title={t("feature_flags")} description={t("admin_flags_description")}>
      <FlagListingView />
    </SettingsHeader>
  );
};

export default Page;
