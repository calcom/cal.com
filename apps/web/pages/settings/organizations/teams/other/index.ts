import OtherTeamListView from "@calcom/features/ee/organizations/pages/settings/other-team-listing-view";

import PageWrapper from "@components/PageWrapper";
import type { CalPageWrapper } from "@components/PageWrapper";

const Page = OtherTeamListView as CalPageWrapper;
Page.PageWrapper = PageWrapper;

export default Page;
