import { _generateMetadata, getTranslate } from "app/_utils";

import { FlagListingView } from "@calcom/features/flags/pages/flag-listing-view";
import SettingsHeader from "@calcom/features/settings/appDir/SettingsHeader";

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => t("feature_flags"),
    (t) => t("admin_flags_description")
  );

const Page = async () => {
  const t = await getTranslate();
  return (
    <SettingsHeader title={t("feature_flags")} description={t("admin_flags_description")}>
      <FlagListingView />
    </SettingsHeader>
  );
};

export default Page;
