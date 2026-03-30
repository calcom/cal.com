import { _generateMetadata, getTranslate } from "app/_utils";

import {
  AppHeader,
  AppHeaderContent,
  AppHeaderDescription,
} from "@coss/ui/shared/app-header";

import AdminBillingView from "~/settings/admin/billing-view";

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => t("admin_billing_title"),
    (t) => t("admin_billing_description"),
    undefined,
    undefined,
    "/settings/admin/billing"
  );

const Page = async () => {
  const t = await getTranslate();
  return (
    <div>
      <AppHeader>
        <AppHeaderContent title={t("admin_billing_title")}>
          <AppHeaderDescription>{t("admin_billing_description")}</AppHeaderDescription>
        </AppHeaderContent>
      </AppHeader>
      <AdminBillingView />
    </div>
  );
};

export default Page;

export const unstable_dynamicStaleTime = 30;
