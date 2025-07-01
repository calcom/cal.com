import { withAppDirSsr } from "app/WithAppDirSsr";
import type { PageProps } from "app/_types";
import { cookies, headers } from "next/headers";

import { buildLegacyCtx } from "@lib/buildLegacyCtx";

import { getServerSideProps } from "@server/lib/auth/sso/direct/getServerSideProps";

import type { SSODirectPageProps } from "~/auth/sso/direct-view";
import SSODirectView from "~/auth/sso/direct-view";

const getData = withAppDirSsr<SSODirectPageProps>(getServerSideProps);
const ServerPage = async ({ params, searchParams }: PageProps) => {
  const context = buildLegacyCtx(await headers(), await cookies(), await params, await searchParams);
  const props = await getData(context);

  return <SSODirectView {...props} />;
};

export default ServerPage;
