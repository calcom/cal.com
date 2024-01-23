import { getServerSideProps, type PageProps } from "@lib/team/[slug]/getServerSideProps";

import PageWrapper from "@components/PageWrapper";
import Team from "@components/pages/team/[slug]";

export { getServerSideProps, PageProps };

Team.isBookingPage = true;
Team.PageWrapper = PageWrapper;

export default Team;
