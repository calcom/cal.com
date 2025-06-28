import { _generateMetadata } from "app/_utils";
import { redirect } from "next/navigation";

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => t("apps"),
    (t) => t("admin_apps_description"),
    undefined,
    undefined,
    "/settings/admin/apps"
  );

const Page = () => {
  redirect("/settings/admin/apps/calendar");
};

export default Page;
