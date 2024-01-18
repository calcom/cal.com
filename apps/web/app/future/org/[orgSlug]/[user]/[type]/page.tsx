import Page, { type PageProps } from "@pages/org/[orgSlug]/[user]/[type]";
import { withAppDirSsr } from "app/WithAppDirSsr";
import { WithLayout } from "app/layoutHOC";

import { getServerSideProps } from "@lib/org/[orgSlug]/[user]/[type]/getServerSideProps";

const getData = withAppDirSsr<PageProps>(getServerSideProps);

export default WithLayout({ getLayout: null, getData, isBookingPage: true, Page });
