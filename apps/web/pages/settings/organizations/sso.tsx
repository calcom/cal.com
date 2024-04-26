import OrgSSOView from "@calcom/features/ee/sso/page/orgs-sso-view";

import type { CalPageWrapper } from "@components/PageWrapper";
import PageWrapper from "@components/PageWrapper";

const Page = OrgSSOView as CalPageWrapper;
Page.PageWrapper = PageWrapper;

export default Page;
