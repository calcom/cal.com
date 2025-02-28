import { withAppDirSsr } from "app/WithAppDirSsr";
import type { PageProps, PageProps as ServerPageProps } from "app/_types";
import { _generateMetadata, getTranslate } from "app/_utils";
import { cookies, headers } from "next/headers";

import { buildLegacyCtx } from "@lib/buildLegacyCtx";

import { getServerSideProps } from "@server/lib/setup/getServerSideProps";

import Setup from "~/auth/setup-view";
import type { PageProps as ClientPageProps } from "~/auth/setup-view";

export const generateMetadata = async ({ params }: PageProps) => {
  const t = await getTranslate(params.lang as string);
  return await _generateMetadata(t("setup"), t("setup_description"));
};

const getData = withAppDirSsr<ClientPageProps>(getServerSideProps);

const ServerPage = async ({ params, searchParams }: ServerPageProps) => {
  const props = await getData(buildLegacyCtx(headers(), cookies(), params, searchParams));
  return <Setup {...props} />;
};

export default ServerPage;
