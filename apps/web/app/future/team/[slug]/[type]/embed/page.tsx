import LegacyPage, { getServerSideProps } from "@pages/team/[slug]/[type]/embed";
import { withAppDirSsr } from "app/WithAppDirSsr";
import withEmbedSsrAppDir from "app/WithEmbedSSR";
import { WithLayout } from "app/layoutHOC";

const getData = withAppDirSsr(getServerSideProps);
const getEmbedData = withEmbedSsrAppDir(getData);

// @ts-expect-error Type is missing the following properties from type: entity, duration, booking, away, and 7 more.
export default WithLayout({ getLayout: null, getData: getEmbedData, Page: LegacyPage })<"P">;
