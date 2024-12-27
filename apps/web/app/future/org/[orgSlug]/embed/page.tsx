import withEmbedSsrAppDir from "app/WithEmbedSSR";
import type { PageProps as _PageProps } from "app/_types";
import { _generateMetadata } from "app/_utils";
import { WithLayout } from "app/layoutHOC";

import { getServerSideProps } from "@lib/team/[slug]/getServerSideProps";

import type { PageProps } from "~/team/team-view";
import TeamPage from "~/team/team-view";

const getEmbedData = withEmbedSsrAppDir<PageProps>(getServerSideProps);

export default WithLayout({
  Page: TeamPage,
  getData: getEmbedData,
  getLayout: null,
  isBookingPage: true,
})<"P">;
