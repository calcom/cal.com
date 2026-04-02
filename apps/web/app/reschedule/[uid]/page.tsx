import { buildLegacyCtx } from "@lib/buildLegacyCtx";
import { getServerSideProps } from "@lib/reschedule/[uid]/getServerSideProps";
import type { PageProps } from "app/_types";
import { withAppDirSsr } from "app/WithAppDirSsr";
import { cookies, headers } from "next/headers";

const getData = withAppDirSsr(getServerSideProps);

const Page = async ({ params, searchParams }: PageProps) => {
  const legacyCtx = buildLegacyCtx(await headers(), await cookies(), await params, await searchParams);

  await getData(legacyCtx);

  return null;
};

export default Page;
