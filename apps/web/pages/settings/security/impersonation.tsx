import { getLayout } from "@calcom/features/settings/layouts/SettingsLayout";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Meta } from "@calcom/ui";

import PageWrapper from "@components/PageWrapper";

import ProfileImpersonationViewWrapper from "~/settings/security/impersonation-view";

const Page = () => {
  const { t } = useLocale();
  return (
    <>
      <Meta
        title={t("impersonation")}
        description={t("impersonation_description")}
        borderInShellHeader={true}
      />
      <ProfileImpersonationViewWrapper />
    </>
  );
};

Page.getLayout = getLayout;
Page.PageWrapper = PageWrapper;

export default Page;
