import { withAppDirSsr } from "app/WithAppDirSsr";
import type { PageProps } from "app/_types";
import { _generateMetadata, getTranslate } from "app/_utils";
import { cookies, headers } from "next/headers";

import { getServerSideProps } from "@lib/apps/getServerSideProps";
import { buildLegacyCtx } from "@lib/buildLegacyCtx";

import AppsPage from "~/apps/apps-view";

export const generateMetadata = async ({ params }: PageProps) => {
  const t = await getTranslate(params.lang);
  return await _generateMetadata(t("app_store"), t("app_store_description"));
};

const getData = withAppDirSsr(getServerSideProps);

const ServerPage = async ({ params, searchParams }: PageProps) => {
  const context = buildLegacyCtx(headers(), cookies(), params, searchParams);

  const props = await getData(context);
  return <AppsPage {...props} />;
};

export default ServerPage;
