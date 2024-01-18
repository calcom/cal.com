import Page, { getServerSideProps, type PageProps } from "@pages/org/[orgSlug]/[user]";
import { withAppDirSsr } from "app/WithAppDirSsr";
import { WithLayout } from "app/layoutHOC";

const getData = withAppDirSsr<PageProps>(getServerSideProps);

export default WithLayout({ getLayout: null, getData, isBookingPage: true, Page });
