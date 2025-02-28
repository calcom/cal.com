import { PageProps } from "app/_types";
import { _generateMetadata, getTranslate } from "app/_utils";

import { FlagListingView } from "@calcom/features/flags/pages/flag-listing-view";
import SettingsHeader from "@calcom/features/settings/appDir/SettingsHeader";

export const generateMetadata = async ({ params }: PageProps) => {
  const t = await getTranslate(params.lang as string);
  return await _generateMetadata(t("feature_flags"), t("admin_flags_description"));
};

const Page = async ({ params }: PageProps) => {
  const t = await getTranslate(params.lang as string);
  return (
    <SettingsHeader title={t("feature_flags")} description={t("admin_flags_description")}>
      <FlagListingView />
    </SettingsHeader>
  );
};

export default Page;
