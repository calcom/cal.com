"use client";

import PrivacyView from "@calcom/features/ee/organizations/pages/settings/privacy";
import { getLayout } from "@calcom/features/settings/layouts/SettingsLayout";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Meta } from "@calcom/ui";

import PageWrapper from "@components/PageWrapper";

const Page = () => {
  const { t } = useLocale();
  return (
    <>
      <Meta
        borderInShellHeader={false}
        title={t("privacy")}
        description={t("privacy_organization_description")}
      />
      <PrivacyView />
    </>
  );
};

Page.getLayout = getLayout;
Page.PageWrapper = PageWrapper;

export default Page;
