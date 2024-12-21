import { withAppDirSsr } from "app/WithAppDirSsr";
import withEmbedSsrAppDir from "app/WithEmbedSSR";
import { WithLayout } from "app/layoutHOC";

import { getServerSideProps } from "@lib/team/[slug]/getServerSideProps";

import type { PageProps } from "~/team/team-view";
import TeamPage from "~/team/team-view";

const getData = withAppDirSsr<PageProps>(getServerSideProps);
const getEmbedData = withEmbedSsrAppDir(getData);

export default WithLayout({
  Page: TeamPage,
  getData: getEmbedData,
  getLayout: null,
  isBookingPage: true,
})<"P">;
