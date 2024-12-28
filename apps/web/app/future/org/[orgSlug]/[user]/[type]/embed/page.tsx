import withEmbedSsrAppDir from "app/WithEmbedSSR";
import { WithLayout } from "app/layoutHOC";

import { getServerSideProps } from "@lib/org/[orgSlug]/[user]/[type]/getServerSideProps";

import { Page, type OrgTypePageProps } from "../page";

const getEmbedData = withEmbedSsrAppDir<OrgTypePageProps>(getServerSideProps);

export default WithLayout({ getLayout: null, getData: getEmbedData, isBookingPage: true, ServerPage: Page });
