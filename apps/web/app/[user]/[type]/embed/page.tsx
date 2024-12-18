import { withAppDirSsr } from "app/WithAppDirSsr";
import withEmbedSsrAppDir from "app/WithEmbedSSR";
import { WithLayout } from "app/layoutHOC";

import { getServerSideProps } from "@server/lib/[user]/[type]/getServerSideProps";

import LegacyPage, { type PageProps } from "~/users/views/users-type-public-view";

export { generateMetadata } from "../page";

const getData = withAppDirSsr<PageProps>(getServerSideProps);

const getEmbedData = withEmbedSsrAppDir(getData);

export default WithLayout({ getLayout: null, getData: getEmbedData, Page: LegacyPage })<"P">;
