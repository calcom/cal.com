import { buildLegacyCtx } from "@lib/buildLegacyCtx";
import { getServerSideProps } from "@server/lib/auth/sso/[provider]/getServerSideProps";
import type { PageProps } from "app/_types";
import { withAppDirSsr } from "app/WithAppDirSsr";
import { cookies, headers } from "next/headers";
import type { SSOProviderPageProps } from "~/auth/sso/provider-view";
import SSOProviderView from "~/auth/sso/provider-view";

const getData = withAppDirSsr<SSOProviderPageProps>(getServerSideProps);
const ServerPage = async ({ params, searchParams }: PageProps) => {
  const context = buildLegacyCtx(await headers(), await cookies(), await params, await searchParams);
  const props = await getData(context);

  return <SSOProviderView {...props} />;
};

export default ServerPage;
