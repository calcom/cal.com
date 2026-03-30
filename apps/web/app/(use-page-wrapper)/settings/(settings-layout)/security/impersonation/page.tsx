import { _generateMetadata, getTranslate } from "app/_utils";

import { AppHeader, AppHeaderContent, AppHeaderDescription } from "@coss/ui/shared/app-header";

import ProfileImpersonationViewWrapper from "~/settings/security/impersonation-view";

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => t("impersonation"),
    (t) => t("impersonation_description"),
    undefined,
    undefined,
    "/settings/security/impersonation"
  );

const Page = async () => {
  const t = await getTranslate();

  return (
    <div>
      <AppHeader>
        <AppHeaderContent title={t("impersonation")}>
          <AppHeaderDescription>{t("impersonation_description")}</AppHeaderDescription>
        </AppHeaderContent>
      </AppHeader>
      <ProfileImpersonationViewWrapper />
    </div>
  );
};

export default Page;

export const unstable_dynamicStaleTime = 30;
