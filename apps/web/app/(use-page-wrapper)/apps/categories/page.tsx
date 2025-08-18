import { withAppDirSsr } from "app/WithAppDirSsr";
import type { PageProps } from "app/_types";
import { cookies, headers } from "next/headers";

import { getServerSideProps } from "@lib/apps/categories/getServerSideProps";
import { buildLegacyCtx } from "@lib/buildLegacyCtx";

import Page from "~/apps/categories/categories-view";

const getData = withAppDirSsr(getServerSideProps);

async function ServerPage({ params, searchParams }: PageProps) {
  const props = await getData(
    buildLegacyCtx(await headers(), await cookies(), await params, await searchParams)
  );

  return <Page {...props} />;
}

export default ServerPage;
