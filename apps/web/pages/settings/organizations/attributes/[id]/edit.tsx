import OrgAttributesEditPage from "@calcom/ee/organizations/pages/settings/attributes/attributes-edit-view";

import type { CalPageWrapper } from "@components/PageWrapper";
import PageWrapper from "@components/PageWrapper";

const Page = OrgAttributesEditPage as CalPageWrapper;
Page.PageWrapper = PageWrapper;

export default Page;
