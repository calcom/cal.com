import PrivacyView from "@calcom/features/ee/organizations/pages/settings/privacy";

import type { CalPageWrapper } from "@components/PageWrapper";
import PageWrapper from "@components/PageWrapper";

const Page = PrivacyView as CalPageWrapper;
Page.PageWrapper = PageWrapper;

export default Page;
