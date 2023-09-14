import TeamBillingView from "@calcom/features/ee/teams/pages/team-billing-view";

import type { CalPageWrapper } from "@components/PageWrapper";
import PageWrapper from "@components/PageWrapper";

const Page = TeamBillingView as CalPageWrapper;
Page.PageWrapper = PageWrapper;

export default Page;
