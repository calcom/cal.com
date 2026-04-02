import { buildLegacyCtx } from "@lib/buildLegacyCtx";
import { getServerSideProps } from "@server/lib/auth/sso/direct/getServerSideProps";
import type { PageProps } from "app/_types";
import { withAppDirSsr } from "app/WithAppDirSsr";
import { cookies, headers } from "next/headers";
import type { SSODirectPageProps } from "~/auth/sso/direct-view";
import SSODirectView from "~/auth/sso/direct-view";

const getData = withAppDirSsr<SSODirectPageProps>(getServerSideProps);
const ServerPage = async ({ params, searchParams }: PageProps) => {
  const context = buildLegacyCtx(await headers(), await cookies(), await params, await searchParams);
  const props = await getData(context);

  return <SSODirectView {...props} />;
};

export default ServerPage;
