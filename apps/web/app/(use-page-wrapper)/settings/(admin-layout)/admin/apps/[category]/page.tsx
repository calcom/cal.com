import { _generateMetadata } from "app/_utils";
import { getTranslate } from "app/_utils";

import AdminAppsList from "~/apps/components/AdminAppsList";
import SettingsHeader from "@calcom/features/settings/appDir/SettingsHeader";

export const generateMetadata = async ({ params }: { params: Promise<{ category: string }> }) =>
  await _generateMetadata(
    (t) => t("apps"),
    (t) => t("admin_apps_description"),
    undefined,
    undefined,
    `/settings/admin/apps/${(await params).category}`
  );

const Page = async () => {
  const t = await getTranslate();

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
