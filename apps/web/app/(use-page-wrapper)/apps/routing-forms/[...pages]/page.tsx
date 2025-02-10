import { withAppDirSsr } from "app/WithAppDirSsr";
import type { PageProps as ServerPageProps } from "app/_types";
import { _generateMetadata } from "app/_utils";
import { cookies, headers } from "next/headers";

import LayoutHandler from "@calcom/app-store/routing-forms/pages/layout-handler/[...appPages]";

import { getServerSideProps } from "@lib/apps/routing-forms/[...pages]/getServerSideProps";
import { buildLegacyCtx } from "@lib/buildLegacyCtx";

export const generateMetadata = async () => {
  return await _generateMetadata(
    (t) => t("routing_forms"),
    () => ""
  );
};

const getData = withAppDirSsr<any>(getServerSideProps);

const ServerPage = async ({ params, searchParams }: ServerPageProps) => {
  const context = buildLegacyCtx(headers(), cookies(), params, searchParams);
  const props = await getData(context);
  const pages = Array.isArray(params.pages) ? params.pages : params.pages?.split("/") ?? [];

  const componentProps = {
    ...props,
    pages: pages.slice(1),
  };
  return <LayoutHandler {...componentProps} />;
};

export default ServerPage;
