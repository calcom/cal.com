import { _generateMetadata, getTranslate } from "app/_utils";

import {
  AppHeader,
  AppHeaderContent,
  AppHeaderDescription,
} from "@coss/ui/shared/app-header";
import { FlagListingView } from "@calcom/web/modules/feature-flags/views/flag-listing-view";

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
    <div>
      <AppHeader>
        <AppHeaderContent title={t("feature_flags")}>
          <AppHeaderDescription>
            {t("admin_flags_description")}
          </AppHeaderDescription>
        </AppHeaderContent>
      </AppHeader>
      <FlagListingView />
    </div>
  );
};

export default Page;