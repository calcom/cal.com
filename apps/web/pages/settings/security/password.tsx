import { getLayout } from "@calcom/features/settings/layouts/SettingsLayout";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Meta } from "@calcom/ui";

import PageWrapper from "@components/PageWrapper";

import PasswordViewWrapper from "~/settings/security/password-view";

const Page = () => {
  const { t } = useLocale();

  return (
    <>
      <Meta title={t("password")} description={t("password_description")} borderInShellHeader={true} />
      <PasswordViewWrapper />
    </>
  );
};

Page.getLayout = getLayout;
Page.PageWrapper = PageWrapper;

export default Page;
