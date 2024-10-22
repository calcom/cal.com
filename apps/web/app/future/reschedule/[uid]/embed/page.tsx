import { getServerSideProps as _getServerSideProps } from "@pages/reschedule/[uid]";
import type { PageProps } from "app/_types";
import { cookies, headers } from "next/headers";

import { buildLegacyCtx } from "@lib/buildLegacyCtx";
import withEmbedSsr from "@lib/withEmbedSsr";

const getData = withEmbedSsr(_getServerSideProps);

const Page = async ({ params, searchParams }: PageProps) => {
  const legacyCtx = buildLegacyCtx(headers(), cookies(), params, searchParams);
  await getData(legacyCtx);

  return null;
};

export default Page;
