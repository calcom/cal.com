import DomainWideDelegationList from "@calcom/features/ee/organizations/pages/settings/domainWideDelegation";
import { getLayout } from "@calcom/features/settings/layouts/SettingsLayout";
import { Meta } from "@calcom/ui";

import PageWrapper from "@components/PageWrapper";

const Page = () => {
  return (
    <>
      <Meta
        borderInShellHeader={false}
        title="Domain-wide delegation"
        description="Domain-wide delegation allows you to manage access to Google Workspace calendars for your organization."
      />
      <DomainWideDelegationList />
    </>
  );
};

Page.getLayout = getLayout;
Page.PageWrapper = PageWrapper;
export default Page;
