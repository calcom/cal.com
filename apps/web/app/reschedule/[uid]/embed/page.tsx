import { withAppDirSsr } from "app/WithAppDirSsr";
import withEmbedSsrAppDir from "app/WithEmbedSSR";
import type { PageProps } from "app/_types";
import { cookies, headers } from "next/headers";

import { buildLegacyCtx } from "@lib/buildLegacyCtx";
import { getServerSideProps } from "@lib/reschedule/[uid]/getServerSideProps";

const getData = withAppDirSsr(getServerSideProps);
const getEmbedData = withEmbedSsrAppDir(getData);

const Page = async ({ params, searchParams }: PageProps) => {
  const legacyCtx = buildLegacyCtx(headers(), cookies(), params, searchParams);
  await getEmbedData(legacyCtx);

  return null;
};

export default Page;
