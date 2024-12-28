import withEmbedSsrAppDir from "app/WithEmbedSSR";
import { WithLayout } from "app/layoutHOC";

import { getServerSideProps } from "@server/lib/[user]/[type]/getServerSideProps";

import LegacyPage, { type PageProps } from "~/users/views/users-type-public-view";

const getEmbedData = withEmbedSsrAppDir<PageProps>(getServerSideProps);

export default WithLayout({ getLayout: null, getData: getEmbedData, Page: LegacyPage })<"P">;
