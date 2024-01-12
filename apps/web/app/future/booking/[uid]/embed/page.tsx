import OldPage from "@pages/booking/[uid]";
import withEmbedSsrAppDir from "app/WithEmbedSSR";
import { WithLayout } from "app/layoutHOC";

import { getData } from "../page";

const getEmbedData = withEmbedSsrAppDir(getData);

// @ts-expect-error Type '(context: GetServerSidePropsContext) => Promise<any>' is not assignable to type '(arg: {
export default WithLayout({ getLayout: null, getData: getEmbedData, Page: OldPage });
