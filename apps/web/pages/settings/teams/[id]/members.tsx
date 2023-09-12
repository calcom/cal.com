import TeamMembersView from "@calcom/features/ee/teams/pages/team-members-view";

import type { CalPageWrapper } from "@components/PageWrapper";
import PageWrapper from "@components/PageWrapper";

const Page = TeamMembersView as CalPageWrapper;
Page.PageWrapper = PageWrapper;

export default Page;
