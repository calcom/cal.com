import { getServerSideProps } from "@pages/reschedule/[uid]";
import { withAppDirSsr } from "app/WithAppDirSsr";
import type { PageProps } from "app/_types";
import { cookies, headers } from "next/headers";

import { buildLegacyCtx } from "@lib/buildLegacyCtx";
import withEmbedSsr from "@lib/withEmbedSsr";

const Page = async ({ params, searchParams }: PageProps) => {
  const legacyCtx = buildLegacyCtx(headers(), cookies(), params, searchParams);
  await withAppDirSsr(withEmbedSsr(getServerSideProps))(legacyCtx);

  return null;
};

export default Page;
