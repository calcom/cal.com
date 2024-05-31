import LegacyPage, { type PageProps, getServerSideProps } from "@pages/team/[slug]";
import { withAppDirSsr } from "app/WithAppDirSsr";
import withEmbedSsrAppDir from "app/WithEmbedSSR";
import { WithLayout } from "app/layoutHOC";

const getData = withAppDirSsr<PageProps>(getServerSideProps);
const getEmbedData = withEmbedSsrAppDir(getData);

export default WithLayout({ getLayout: null, getData: getEmbedData, Page: LegacyPage })<"P">;
