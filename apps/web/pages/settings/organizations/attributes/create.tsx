import OrgAttributesCreatePage from "@calcom/ee/organizations/pages/settings/attributes/attributes-create-view";

import type { CalPageWrapper } from "@components/PageWrapper";
import PageWrapper from "@components/PageWrapper";

const Page = OrgAttributesCreatePage as CalPageWrapper;
Page.PageWrapper = PageWrapper;

export default Page;
