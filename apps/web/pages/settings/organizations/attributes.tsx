import OrgSettingsAttributesPage from "@calcom/features/ee/organizations/pages/settings/attributes";

import type { CalPageWrapper } from "@components/PageWrapper";
import PageWrapper from "@components/PageWrapper";

const Page = OrgSettingsAttributesPage as CalPageWrapper;
Page.PageWrapper = PageWrapper;

export default Page;
