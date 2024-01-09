import { getServerSideProps } from "@pages/reschedule/[uid]";
import { withAppDirSsr } from "app/WithAppDirSsr";
import type { Params } from "next/dist/shared/lib/router/utils/route-matcher";
import { cookies, headers } from "next/headers";

import { buildLegacyCtx } from "@lib/buildLegacyCtx";
import withEmbedSsr from "@lib/withEmbedSsr";

type PageProps = Readonly<{
  params: Params;
}>;

const Page = async ({ params }: PageProps) => {
  const legacyCtx = buildLegacyCtx(headers(), cookies(), params);
  await withAppDirSsr(withEmbedSsr(getServerSideProps))(legacyCtx);

  return null;
};

export default Page;
