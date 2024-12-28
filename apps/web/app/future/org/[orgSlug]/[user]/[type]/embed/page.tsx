import withEmbedSsrAppDir from "app/WithEmbedSSR";
import { WithLayout } from "app/layoutHOC";
import { Page, type OrgTypePageProps } from "app/org/[orgSlug]/[user]/[type]/page";

import { getServerSideProps } from "@lib/org/[orgSlug]/[user]/[type]/getServerSideProps";

const getEmbedData = withEmbedSsrAppDir<OrgTypePageProps>(getServerSideProps);

export default WithLayout({ getLayout: null, getData: getEmbedData, isBookingPage: true, ServerPage: Page });
