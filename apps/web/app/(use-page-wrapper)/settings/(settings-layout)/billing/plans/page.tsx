import { AppHeader, AppHeaderContent, AppHeaderDescription } from "@coss/ui/shared/app-header";
import { _generateMetadata, getTranslate } from "app/_utils";
import PlansView from "~/settings/billing/plans/plans-view";

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => t("plans"),
    (t) => t("plans_page_description"),
    undefined,
    undefined,
    "/settings/billing/plans"
  );

const Page = async () => {
  const t = await getTranslate();

  return (
    <>
      <AppHeader>
        <AppHeaderContent title={t("plans")}>
          <AppHeaderDescription>{t("plans_page_description")}</AppHeaderDescription>
        </AppHeaderContent>
      </AppHeader>
      <PlansView context="personal" />
    </>
  );
};

export default Page;

export const unstable_dynamicStaleTime = 30;
