import UserSSOView from "@calcom/features/ee/sso/page/user-sso-view";
import { getLayout } from "@calcom/features/settings/layouts/SettingsLayout";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Meta } from "@calcom/ui";

import PageWrapper from "@components/PageWrapper";

const Page = () => {
  const { t } = useLocale();

  return (
    <>
      <Meta
        title={t("sso_configuration")}
        description={t("sso_configuration_description")}
        borderInShellHeader={true}
      />
      <UserSSOView />
    </>
  );
};
Page.PageWrapper = PageWrapper;
Page.getLayout = getLayout;

export default Page;
