import { withAppDirSsg } from "app/WithAppDirSsg";
import { WithLayout } from "app/layoutHOC";

import { getStaticProps } from "@lib/404/getStaticProps";

import NotFoundPage from "@components/pages/404";

const getData = withAppDirSsg(getStaticProps);

export const dynamic = "force-static";

export default WithLayout({ getLayout: null, getData, Page: NotFoundPage });
