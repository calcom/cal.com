import { withAppDirSsr } from "app/WithAppDirSsr";
import withEmbedSsrAppDir from "app/WithEmbedSSR";
import { WithLayout } from "app/layoutHOC";

import { getServerSideProps } from "@server/lib/[user]/getServerSideProps";

import type { PageProps as UserPageProps } from "~/users/views/users-public-view";
import LegacyPage from "~/users/views/users-public-view";

export { generateMetadata } from "../page";

const getData = withAppDirSsr<UserPageProps>(getServerSideProps);

const getEmbedData = withEmbedSsrAppDir(getData);

export default WithLayout({ getLayout: null, getData: getEmbedData, Page: LegacyPage })<"P">;
