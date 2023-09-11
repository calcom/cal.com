import TeamSSOView from "@calcom/features/ee/sso/page/teams-sso-view";
import { checkFeatureFlag } from "@calcom/features/flags/server/utils";

import type { CalPageWrapper } from "@components/PageWrapper";
import PageWrapper from "@components/PageWrapper";

const Page = TeamSSOView as CalPageWrapper;
Page.PageWrapper = PageWrapper;

export default Page;
export const getServerSideProps = async () => {
  return checkFeatureFlag("teams");
};
