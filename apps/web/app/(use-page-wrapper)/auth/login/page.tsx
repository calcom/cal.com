import { withAppDirSsr } from "app/WithAppDirSsr";
import type { PageProps as ServerPageProps } from "app/_types";
import { _generateMetadata } from "app/_utils";
import { cookies, headers } from "next/headers";

import { buildLegacyCtx } from "@lib/buildLegacyCtx";

import { getServerSideProps } from "@server/lib/auth/login/getServerSideProps";

import type { PageProps as ClientPageProps } from "~/auth/login-view";
import Login from "~/auth/login-view";

export const generateMetadata = async () => {
  return await _generateMetadata(
    (t) => t("login"),
    (t) => t("login"),
    undefined,
    undefined,
    "/auth/login"
  );
};

const getData = withAppDirSsr<ClientPageProps>(getServerSideProps);

const ServerPage = async ({ params, searchParams }: ServerPageProps) => {
  const props = await getData(
    buildLegacyCtx(await headers(), await cookies(), await params, await searchParams)
  );
  return <Login {...props} />;
};

export default ServerPage;
