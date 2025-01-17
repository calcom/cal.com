import { getServerSideProps, type PageProps } from "@pages/org/[orgSlug]/[user]";
import Page from "@pages/org/[orgSlug]/[user]/embed";
import withEmbedSsrAppDir from "app/WithEmbedSSR";
import { WithLayout } from "app/layoutHOC";

const getEmbedData = withEmbedSsrAppDir<PageProps>(getServerSideProps);

export default WithLayout({ getLayout: null, getData: getEmbedData, isBookingPage: true, Page });
