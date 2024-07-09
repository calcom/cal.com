import NotFoundPage from "@pages/404";
import { WithLayout } from "app/layoutHOC";
import type { GetStaticPropsContext } from "next";

const getData = async (context: GetStaticPropsContext) => {
  return {};
};

export const dynamic = "force-static";

export default WithLayout({ getLayout: null, getData, Page: NotFoundPage });
