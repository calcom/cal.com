import OldPage from "@pages/booking/[uid]/embed";
import { withAppDirSsr } from "app/WithAppDirSsr";
import withEmbedSsrAppDir from "app/WithEmbedSSR";
import { WithLayout } from "app/layoutHOC";

import { type PageProps } from "~/bookings/views/bookings-single-view";
import { getServerSideProps } from "~/bookings/views/bookings-single-view.getServerSideProps";

const getData = withAppDirSsr<PageProps>(getServerSideProps);

const getEmbedData = withEmbedSsrAppDir(getData);

export default WithLayout({ getLayout: null, getData: getEmbedData, Page: OldPage });
