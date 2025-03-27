import { withAppDirSsr } from "app/WithAppDirSsr";
import type { PageProps } from "app/_types";
import { headers, cookies } from "next/headers";

import { buildLegacyCtx } from "@lib/buildLegacyCtx";
import { getServerSideProps } from "@lib/reschedule/[uid]/getServerSideProps";

const getData = withAppDirSsr(getServerSideProps);

const Page = async ({ params, searchParams }: PageProps) => {
  const legacyCtx = await buildLegacyCtx(await headers(), await cookies(), await params, await searchParams);

  await getData(legacyCtx);

  return null;
};

export default Page;
