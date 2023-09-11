import TeamProfileView from "@calcom/features/ee/teams/pages/team-profile-view";
import { checkFeatureFlag } from "@calcom/features/flags/server/utils";

import type { CalPageWrapper } from "@components/PageWrapper";
import PageWrapper from "@components/PageWrapper";

const Page = TeamProfileView as CalPageWrapper;
Page.PageWrapper = PageWrapper;

export default Page;
export const getServerSideProps = async () => {
  return checkFeatureFlag("teams");
};
