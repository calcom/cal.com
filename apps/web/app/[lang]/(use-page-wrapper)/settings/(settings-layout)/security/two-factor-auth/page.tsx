import type { PageProps } from "app/_types";
import { _generateMetadata } from "app/_utils";
import { getTranslate } from "app/_utils";

import SettingsHeader from "@calcom/features/settings/appDir/SettingsHeader";

import TwoFactorAuthView from "~/settings/security/two-factor-auth-view";

export const generateMetadata = async ({ params }: PageProps) => {
  const t = await getTranslate(params.lang as string);
  return await _generateMetadata(t("two_factor_auth"), t("add_an_extra_layer_of_security"));
};

const Page = async ({ params }: PageProps) => {
  const t = await getTranslate(params.lang as string);

  return (
    <SettingsHeader
      title={t("2fa")}
      description={t("set_up_two_factor_authentication")}
      borderInShellHeader={true}>
      <TwoFactorAuthView />
    </SettingsHeader>
  );
};

export default Page;
