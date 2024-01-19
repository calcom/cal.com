import { getServerSideProps } from "@pages/reschedule/[uid]";
import OldPage from "@pages/reschedule/[uid]";
import { withAppDirSsr } from "app/WithAppDirSsr";
import withEmbedSsrAppDir from "app/WithEmbedSSR";
import { WithLayout } from "app/layoutHOC";

const getData = withAppDirSsr(getServerSideProps);

const getEmbedData = withEmbedSsrAppDir(getData);

export default WithLayout({ getLayout: null, getData: getEmbedData, Page: OldPage });
