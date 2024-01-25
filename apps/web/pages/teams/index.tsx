import { getLayout } from "@calcom/features/MainLayout";

import { type AppProps } from "@lib/app-providers";

import PageWrapper, { type CalPageWrapper } from "@components/PageWrapper";
import TeamsPage from "@components/pages/teams";

export { getServerSideProps } from "@lib/teams/getServerSideProps";

const Teams = TeamsPage as CalPageWrapper & {
  getLayout: AppProps["Component"]["getLayout"];
  requiresLicense: AppProps["Component"]["requiresLicense"];
};

Teams.requiresLicense = false;
Teams.PageWrapper = PageWrapper;
Teams.getLayout = getLayout;
export default Teams;
