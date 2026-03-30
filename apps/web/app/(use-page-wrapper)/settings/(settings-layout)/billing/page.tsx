import { AppHeader, AppHeaderContent, AppHeaderDescription } from "@coss/ui/shared/app-header";
import { _generateMetadata, getTranslate } from "app/_utils";
import BillingView from "~/settings/billing/billing-view";

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => t("billing"),
    (t) => t("manage_billing_description"),
    undefined,
    undefined,
    "/settings/billing"
  );

const Page = async () => {
  const t = await getTranslate();

  return (
    <div>
      <AppHeader>
        <AppHeaderContent title={t("billing")}>
          <AppHeaderDescription>{t("manage_billing_description")}</AppHeaderDescription>
        </AppHeaderContent>
      </AppHeader>
      <BillingView />
    </div>
  );
};

export default Page;

export const unstable_dynamicStaleTime = 30;
