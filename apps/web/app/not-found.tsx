import NotFoundPage from "@pages/404";
import { WithLayout } from "app/layoutHOC";
import type { GetStaticPropsContext } from "next";

import { ssgInit } from "@server/lib/ssg";

const getData = async (context: GetStaticPropsContext) => {
  const ssg = await ssgInit(context);

  return {
    dehydratedState: ssg.dehydrate(),
  };
};

export const dynamic = "force-static";

export default WithLayout({ getLayout: null, getData, Page: NotFoundPage });
