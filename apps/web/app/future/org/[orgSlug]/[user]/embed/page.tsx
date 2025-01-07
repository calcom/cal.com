import withEmbedSsrAppDir from "app/WithEmbedSSR";
import { WithLayout } from "app/layoutHOC";
import { Page, type OrgPageProps } from "app/org/[orgSlug]/[user]/page";

import { getServerSideProps } from "@lib/org/[orgSlug]/[user]/getServerSideProps";

const getEmbedData = withEmbedSsrAppDir<OrgPageProps>(getServerSideProps);

export default WithLayout({ getLayout: null, getData: getEmbedData, isBookingPage: true, ServerPage: Page });
