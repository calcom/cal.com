import Page from "@pages/settings/admin/apps/index";
import { _generateMetadata } from "_app/_utils";

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => t("apps"),
    (t) => t("admin_apps_description")
  );

export default Page;
