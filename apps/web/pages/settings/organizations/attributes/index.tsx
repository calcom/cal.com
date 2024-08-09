import OrgSettingsAttributesPage from "@calcom/ee/organizations/pages/settings/attributes/attributes-list-view";

import type { CalPageWrapper } from "@components/PageWrapper";
import PageWrapper from "@components/PageWrapper";

const Page = OrgSettingsAttributesPage as CalPageWrapper;
Page.PageWrapper = PageWrapper;

export default Page;
