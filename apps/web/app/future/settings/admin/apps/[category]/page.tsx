import { _generateMetadata } from "app/_utils";

import AdminAppsView from "~/settings/admin/apps/admin-apps-view";

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => t("apps"),
    (t) => t("admin_apps_description")
  );

export default AdminAppsView;
