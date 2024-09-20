import AdminAPIView from "@calcom/features/ee/organizations/pages/settings/admin-api";
import { getLayout } from "@calcom/features/settings/layouts/SettingsLayout";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Meta } from "@calcom/ui";

import PageWrapper from "@components/PageWrapper";

const Page = () => {
  const { t } = useLocale();
  return (
    <>
      <Meta
        title={`${t("admin")} ${t("api_reference")}`}
        description={t("leverage_our_api")}
        borderInShellHeader={false}
      />
      <AdminAPIView />
    </>
  );
};

Page.PageWrapper = PageWrapper;
Page.getLayout = getLayout;

export default Page;
