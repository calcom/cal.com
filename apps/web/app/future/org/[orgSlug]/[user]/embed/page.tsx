import { getServerSideProps, type PageProps } from "@pages/org/[orgSlug]/[user]";
import Page from "@pages/org/[orgSlug]/[user]/embed";
import { withAppDir } from "app/AppDirSSRHOC";
import withEmbedSsrAppDir from "app/WithEmbedSSR";
import { WithLayout } from "app/layoutHOC";

const getData = withAppDir<PageProps>(getServerSideProps);
const getEmbedData = withEmbedSsrAppDir(getData);

export default WithLayout({ getLayout: null, getData: getEmbedData, isBookingPage: true, Page });
