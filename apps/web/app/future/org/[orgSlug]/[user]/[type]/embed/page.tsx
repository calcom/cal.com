import Page from "@pages/org/[orgSlug]/[user]/[type]/embed";
import withEmbedSsrAppDir from "app/WithEmbedSSR";
import { WithLayout } from "app/layoutHOC";
import type { OrgTypePageProps } from "app/org/[orgSlug]/[user]/[type]/page";

import { getServerSideProps } from "@lib/org/[orgSlug]/[user]/[type]/getServerSideProps";

const getEmbedData = withEmbedSsrAppDir<OrgTypePageProps>(getServerSideProps);

export default WithLayout({ getLayout: null, getData: getEmbedData, isBookingPage: true, Page });
