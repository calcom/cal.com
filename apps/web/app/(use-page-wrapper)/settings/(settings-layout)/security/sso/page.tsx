import { _generateMetadata, getTranslate } from "app/_utils";

import { AppHeader, AppHeaderContent, AppHeaderDescription } from "@coss/ui/shared/app-header";

import SAMLSSO from "~/ee/sso/views/user-sso-view";

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => t("sso_configuration"),
    (t) => t("sso_configuration_description"),
    undefined,
    undefined,
    "/settings/security/sso"
  );

const Page = async () => {
  const t = await getTranslate();

  return (
    <div>
      <AppHeader>
        <AppHeaderContent title={t("sso_configuration")}>
          <AppHeaderDescription>{t("sso_configuration_description")}</AppHeaderDescription>
        </AppHeaderContent>
      </AppHeader>
      <SAMLSSO />
    </div>
  );
};

export default Page;
