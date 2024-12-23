import withEmbedSsrAppDir from "app/WithEmbedSSR";
import { WithLayout } from "app/layoutHOC";

import { getServerSideProps } from "@lib/team/[slug]/getServerSideProps";

import type { PageProps } from "~/team/team-view";
import LegacyPage from "~/team/team-view";

const getEmbedData = withEmbedSsrAppDir<PageProps>(getServerSideProps);

export default WithLayout({ getLayout: null, getData: getEmbedData, Page: LegacyPage })<"P">;
