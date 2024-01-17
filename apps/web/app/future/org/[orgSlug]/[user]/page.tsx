import Page, { getServerSideProps, type PageProps } from "@pages/org/[orgSlug]/[user]";
import { withAppDir } from "app/AppDirSSRHOC";
import { WithLayout } from "app/layoutHOC";

const getData = withAppDir<PageProps>(getServerSideProps);

export default WithLayout({ getLayout: null, getData, isBookingPage: true, Page });
