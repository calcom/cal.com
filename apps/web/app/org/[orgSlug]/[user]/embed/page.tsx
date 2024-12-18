import { withAppDirSsr } from "app/WithAppDirSsr";
import withEmbedSsrAppDir from "app/WithEmbedSSR";
import { WithLayout } from "app/layoutHOC";

import { getServerSideProps } from "@lib/org/[orgSlug]/[user]/getServerSideProps";

import { Page, type OrgPageProps } from "../page";

const getData = withAppDirSsr<OrgPageProps>(getServerSideProps);

const getEmbedData = withEmbedSsrAppDir(getData);

export default WithLayout({ getLayout: null, getData: getEmbedData, isBookingPage: true, ServerPage: Page });
