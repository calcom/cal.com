import TeamProfileView from "@calcom/features/ee/teams/pages/team-profile-view";

import type { CalPageWrapper } from "@components/PageWrapper";
import PageWrapper from "@components/PageWrapper";

const Page = TeamProfileView as CalPageWrapper;
Page.PageWrapper = PageWrapper;

export default Page;
