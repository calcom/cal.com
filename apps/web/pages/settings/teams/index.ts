import TeamListView from "@calcom/features/ee/teams/pages/team-listing-view";

import PageWrapper from "@components/PageWrapper";
import type { CalPageWrapper } from "@components/PageWrapper";

const Page = TeamListView as CalPageWrapper;
Page.PageWrapper = PageWrapper;

export default Page;
