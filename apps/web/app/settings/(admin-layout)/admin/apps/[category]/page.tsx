import { _generateMetadata } from "app/_utils";
import { getFixedT } from "app/_utils";

import { getServerSessionForAppDir } from "@calcom/feature-auth/lib/get-server-session-for-app-dir";
import AdminAppsList from "@calcom/features/apps/AdminAppsList";
import SettingsHeader from "@calcom/features/settings/appDir/SettingsHeader";

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => t("apps"),
    (t) => t("admin_apps_description")
  );

const Page = async () => {
  const session = await getServerSessionForAppDir();

  const t = await getFixedT(session?.user.locale || "en");

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
