import { withAppDirSsr } from "app/WithAppDirSsr";
import type { PageProps as ServerPageProps } from "app/_types";
import { _generateMetadata } from "app/_utils";
import { cookies, headers } from "next/headers";

import { buildLegacyCtx } from "@lib/buildLegacyCtx";

import { getServerSideProps } from "@server/lib/setup/getServerSideProps";

import Setup from "~/auth/setup-view";
import type { PageProps as ClientPageProps } from "~/auth/setup-view";

export const generateMetadata = async () => {
  return await _generateMetadata(
    (t) => t("setup"),
    (t) => t("setup_description")
  );
};

const getData = withAppDirSsr<ClientPageProps>(getServerSideProps);

const ServerPage = async ({ params, searchParams }: ServerPageProps) => {
  const props = await getData(buildLegacyCtx(headers(), cookies(), params, searchParams));
  return <Setup {...props} />;
};

export default ServerPage;
