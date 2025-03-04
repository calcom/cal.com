import type { PageProps } from "app/_types";
import { _generateMetadata } from "app/_utils";
import { getTranslate } from "app/_utils";

import AdminAppsList from "@calcom/features/apps/AdminAppsList";
import SettingsHeader from "@calcom/features/settings/appDir/SettingsHeader";

export const generateMetadata = async ({ params }: PageProps) => {
  const t = await getTranslate(params.lang);
  await _generateMetadata(t("apps"), t("admin_apps_description"));
};

const Page = async ({ params }: PageProps) => {
  const t = await getTranslate(params.lang);

  return (
    <SettingsHeader title={t("apps")} description={t("admin_apps_description")}>
      <div className="flex">
        <AdminAppsList
          baseURL="/settings/admin/apps"
          classNames={{
            appCategoryNavigationRoot: "overflow-x-scroll",
          }}
        />
      </div>
    </SettingsHeader>
  );
};

export default Page;
