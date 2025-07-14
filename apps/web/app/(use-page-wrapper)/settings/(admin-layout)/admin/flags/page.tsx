import { _generateMetadata, getTranslate } from "app/_utils";

import { FlagListingView } from "@calcom/features/flags/pages/flag-listing-view";
import SettingsHeader from "@calcom/features/settings/appDir/SettingsHeader";
import { Button } from "@calcom/ui/components/button";

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => t("feature_flags"),
    (t) => t("admin_flags_description"),
    undefined,
    undefined,
    "/settings/admin/flags"
  );

const Page = async () => {
  const t = await getTranslate();
  return (
    <SettingsHeader title={t("feature_flags")} description={t("admin_flags_description")}>
      <div className="mb-4">
        <Button color="minimal" href="/settings/admin/flags/teams">
          {t("team_features")}
        </Button>
      </div>
      <FlagListingView />
    </SettingsHeader>
  );
};

export default Page;
