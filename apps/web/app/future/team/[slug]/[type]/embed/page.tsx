import withEmbedSsrAppDir from "app/WithEmbedSSR";
import { WithLayout } from "app/layoutHOC";

import { getServerSideProps } from "@lib/team/[slug]/[type]/getServerSideProps";

import type { PageProps } from "~/team/type-view";
import LegacyPage from "~/team/type-view";

const getEmbedData = withEmbedSsrAppDir<PageProps>(getServerSideProps);

export default WithLayout({ getLayout: null, getData: getEmbedData, Page: LegacyPage })<"P">;
