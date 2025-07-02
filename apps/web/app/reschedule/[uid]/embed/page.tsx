import withEmbedSsrAppDir from "app/WithEmbedSSR";
import type { PageProps } from "app/_types";
import { cookies, headers } from "next/headers";

import { buildLegacyCtx } from "@lib/buildLegacyCtx";
import { getServerSideProps } from "@lib/reschedule/[uid]/getServerSideProps";

const getEmbedData = withEmbedSsrAppDir(getServerSideProps);

const Page = async ({ params, searchParams }: PageProps) => {
  const legacyCtx = buildLegacyCtx(await headers(), await cookies(), await params, await searchParams);
  await getEmbedData(legacyCtx);

  return null;
};

export default Page;
