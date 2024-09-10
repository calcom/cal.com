import { getLayout } from "@calcom/features/settings/layouts/SettingsLayout";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Meta } from "@calcom/ui";

import PageWrapper from "@components/PageWrapper";

import AppearancePage from "~/settings/my-account/appearance-view";

const Page = () => {
  const { t } = useLocale();

  return (
    <>
      <Meta title={t("appearance")} description={t("appearance_description")} borderInShellHeader={false} />
      <AppearancePage />
    </>
  );
};

Page.getLayout = getLayout;
Page.PageWrapper = PageWrapper;

export default Page;
