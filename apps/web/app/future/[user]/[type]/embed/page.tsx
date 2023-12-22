import LegacyPage from "@pages/[user]/[type]";
import withEmbedSsrAppDir from "app/WithEmbedSSR";
import { WithLayout } from "app/layoutHOC";

import { getPageProps } from "../page";

const getEmbedData = withEmbedSsrAppDir(getPageProps);

export default WithLayout({ getLayout: null, getData: getEmbedData, Page: LegacyPage })<"P">;
