import withEmbedSsrAppDir from "app/WithEmbedSSR";
import { WithLayout } from "app/layoutHOC";

import OldPage from "~/bookings/views/bookings-single-view";
import { getServerSideProps, type PageProps } from "~/bookings/views/bookings-single-view.getServerSideProps";

const getEmbedData = withEmbedSsrAppDir<PageProps>(getServerSideProps);

export default WithLayout({ getLayout: null, getData: getEmbedData, Page: OldPage });
