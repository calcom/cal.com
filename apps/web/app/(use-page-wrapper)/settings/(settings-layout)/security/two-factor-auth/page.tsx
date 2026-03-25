import { AppHeader, AppHeaderContent, AppHeaderDescription } from "@coss/ui/shared/app-header";
import { _generateMetadata, getTranslate } from "app/_utils";
import TwoFactorAuthView from "~/settings/security/two-factor-auth-view";

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => t("two_factor_auth"),
    (t) => t("add_an_extra_layer_of_security"),
    undefined,
    undefined,
    "/settings/security/two-factor-auth"
  );

const Page = async () => {
  const t = await getTranslate();

  return (
    <div>
      <AppHeader>
        <AppHeaderContent title={t("2fa")}>
          <AppHeaderDescription>{t("set_up_two_factor_authentication")}</AppHeaderDescription>
        </AppHeaderContent>
      </AppHeader>
      <TwoFactorAuthView />
    </div>
  );
};

export default Page;
