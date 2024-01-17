import { type PageProps } from "@pages/org/[orgSlug]/[user]/[type]";
import Page from "@pages/org/[orgSlug]/[user]/[type]/embed";
import { withAppDir } from "app/AppDirSSRHOC";
import withEmbedSsrAppDir from "app/WithEmbedSSR";
import { WithLayout } from "app/layoutHOC";

import { getServerSideProps } from "@lib/org/[orgSlug]/[user]/[type]/getServerSideProps";

const getData = withAppDir<PageProps>(getServerSideProps);

const getEmbedData = withEmbedSsrAppDir(getData);

export default WithLayout({ getLayout: null, getData: getEmbedData, isBookingPage: true, Page });
