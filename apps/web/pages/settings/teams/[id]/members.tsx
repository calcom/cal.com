import TeamMembersView from "@calcom/features/ee/teams/pages/team-members-view";
import { checkFeatureFlag } from "@calcom/features/flags/server/utils";

import type { CalPageWrapper } from "@components/PageWrapper";
import PageWrapper from "@components/PageWrapper";

const Page = TeamMembersView as CalPageWrapper;
Page.PageWrapper = PageWrapper;

export default Page;
export const getServerSideProps = async () => {
  return checkFeatureFlag("teams");
};
