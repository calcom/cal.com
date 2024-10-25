import { getServerSideProps as _getServerSideProps } from "@pages/reschedule/[uid]";
import type { PageProps } from "app/_types";
import { cookies, headers } from "next/headers";

import { buildLegacyCtx } from "@lib/buildLegacyCtx";
import withEmbedSsr from "@lib/withEmbedSsr";

const getData = withEmbedSsr(_getServerSideProps);

const Page = async (props: PageProps) => {
  const searchParams = await props.searchParams;
  const params = await props.params;
  const legacyCtx = buildLegacyCtx(await headers(), await cookies(), params, searchParams);
  await getData(legacyCtx);

  return null;
};

export default Page;
