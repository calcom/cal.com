import { getLayout } from "@calcom/features/settings/layouts/SettingsLayout";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Meta } from "@calcom/ui";

import PageWrapper from "@components/PageWrapper";

import GeneralQueryView from "~/settings/my-account/general-view";

const Page = () => {
  const { t } = useLocale();

  return (
    <>
      <Meta title={t("general")} description={t("general_description")} borderInShellHeader={true} />
      <GeneralQueryView />
    </>
  );
};

Page.getLayout = getLayout;
Page.PageWrapper = PageWrapper;

export default Page;
