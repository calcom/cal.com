import { withAppDirSsr } from "app/WithAppDirSsr";
import type { PageProps } from "app/_types";
import { cookies, headers } from "next/headers";

import { getServerSideProps } from "@lib/apps/installed/getServerSideProps";
import { buildLegacyCtx } from "@lib/buildLegacyCtx";

const getData = withAppDirSsr(getServerSideProps);

const Page = async ({ params, searchParams }: PageProps) => {
  const legacyCtx = buildLegacyCtx(headers(), cookies(), params, searchParams);

  await getData(legacyCtx);

  return null;
};

export default Page;
