import OrgAppearanceView from "@calcom/features/ee/organizations/pages/settings/appearance";

import type { CalPageWrapper } from "@components/PageWrapper";
import PageWrapper from "@components/PageWrapper";

const Page = OrgAppearanceView as CalPageWrapper;
Page.PageWrapper = PageWrapper;

export default Page;
