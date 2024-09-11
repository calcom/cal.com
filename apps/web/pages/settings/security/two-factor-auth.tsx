import { getLayout } from "@calcom/features/settings/layouts/SettingsLayout";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Meta } from "@calcom/ui";

import PageWrapper from "@components/PageWrapper";

import TwoFactorAuthView from "~/settings/security/two-factor-auth-view";

const Page = () => {
  const { t } = useLocale();
  return (
    <>
      <Meta title={t("2fa")} description={t("set_up_two_factor_authentication")} borderInShellHeader={true} />
      <TwoFactorAuthView />
    </>
  );
};

Page.getLayout = getLayout;
Page.PageWrapper = PageWrapper;

export default Page;
