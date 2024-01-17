import Page, { type PageProps } from "@pages/org/[orgSlug]/[user]/[type]";
import { withAppDir } from "app/AppDirSSRHOC";
import { WithLayout } from "app/layoutHOC";

import { getServerSideProps } from "@lib/org/[orgSlug]/[user]/[type]/getServerSideProps";

const getData = withAppDir<PageProps>(getServerSideProps);

export default WithLayout({ getLayout: null, getData, isBookingPage: true, Page });
