import NotFoundPage from "@pages/404";
import { WithLayout } from "app/layoutHOC";

import type { buildLegacyCtx } from "@lib/buildLegacyCtx";

import { ssgInit } from "@server/lib/ssg";

const getData = async (context: ReturnType<typeof buildLegacyCtx>) => {
  const ssg = await ssgInit(context);

  return {
    dehydratedState: ssg.dehydrate(),
  };
};

export const dynamic = "force-static";

export default WithLayout({ getLayout: null, getData, Page: NotFoundPage });
