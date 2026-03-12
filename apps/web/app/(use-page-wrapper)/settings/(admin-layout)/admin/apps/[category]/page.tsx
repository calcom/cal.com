import { _generateMetadata } from "app/_utils";
import { getTranslate } from "app/_utils";

import AdminAppsList from "~/apps/components/AdminAppsList";
import {
  AppHeader,
  AppHeaderContent,
  AppHeaderDescription,
} from "@coss/ui/shared/app-header";

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
    <>
      <AppHeader>
        <AppHeaderContent title={t("apps")}>
          <AppHeaderDescription>{t("admin_apps_description")}</AppHeaderDescription>
        </AppHeaderContent>
      </AppHeader>
      <AdminAppsList
        baseURL="/settings/admin/apps"
      />
    </>
  );
};

export default Page;
