import { withAppDirSsr } from "app/WithAppDirSsr";
import type { PageProps as ServerPageProps } from "app/_types";
import { cookies, headers } from "next/headers";

import { buildLegacyCtx } from "@lib/buildLegacyCtx";

import { getServerSideProps } from "@server/lib/setup/getServerSideProps";

import Setup from "~/auth/setup-view";
import type { PageProps as ClientPageProps } from "~/auth/setup-view";

const getData = withAppDirSsr<ClientPageProps>(getServerSideProps);

const ServerPage = async ({ params, searchParams }: ServerPageProps) => {
  const props = await getData(buildLegacyCtx(headers(), cookies(), params, searchParams));
  return <Setup {...props} />;
};

export default ServerPage;
