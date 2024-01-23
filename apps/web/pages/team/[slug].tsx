import { type AppProps } from "@lib/app-providers";
import { getServerSideProps, type PageProps } from "@lib/team/[slug]/getServerSideProps";

import PageWrapper from "@components/PageWrapper";
import { type CalPageWrapper } from "@components/PageWrapper";
import TeamPage from "@components/pages/team/[slug]";

export { getServerSideProps, PageProps };

const Team = TeamPage as unknown as CalPageWrapper & {
  isBookingPage: AppProps["Component"]["isBookingPage"];
};
Team.isBookingPage = true;
Team.PageWrapper = PageWrapper;

export default Team;
