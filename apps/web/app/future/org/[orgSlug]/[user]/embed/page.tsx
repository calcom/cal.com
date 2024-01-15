import Page from "@pages/org/[orgSlug]/[user]/embed";
import withEmbedSsrAppDir from "app/WithEmbedSSR";
import { WithLayout } from "app/layoutHOC";

import { getData } from "../page";

const getEmbedData = withEmbedSsrAppDir(getData);

export default WithLayout({ getLayout: null, getData: getEmbedData, isBookingPage: true, Page });
