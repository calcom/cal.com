import DomainWideDelegationList from "@calcom/features/ee/organizations/pages/settings/domainWideDelegation/domainWideDelegationList";
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
        title={t("domain_wide_delegation")}
        description={t("domain_wide_delegation_description")}
      />
      <DomainWideDelegationList />
    </>
  );
};

Page.getLayout = getLayout;
Page.PageWrapper = PageWrapper;
export default Page;
