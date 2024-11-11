import { getLayout } from "@calcom/features/settings/layouts/SettingsLayout";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Meta } from "@calcom/ui";

import PageWrapper from "@components/PageWrapper";

import BillingView from "~/settings/billing/billing-view";

const Page = () => {
  const { t } = useLocale();

  return (
    <>
      <Meta title={t("billing")} description={t("manage_billing_description")} borderInShellHeader={true} />
      <BillingView />
    </>
  );
};

Page.getLayout = getLayout;
Page.PageWrapper = PageWrapper;

export default Page;
