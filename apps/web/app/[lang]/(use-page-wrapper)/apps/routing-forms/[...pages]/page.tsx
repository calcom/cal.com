import { withAppDirSsr } from "app/WithAppDirSsr";
import type { PageProps as ServerPageProps } from "app/_types";
import { _generateMetadata } from "app/_utils";
import { cookies, headers } from "next/headers";

import type { routingServerSidePropsConfig } from "@calcom/app-store/routing-forms/pages/app-routing.config";
import LayoutHandler from "@calcom/app-store/routing-forms/pages/layout-handler/[...appPages]";
import Shell from "@calcom/features/shell/Shell";

import { getServerSideProps } from "@lib/apps/routing-forms/[...pages]/getServerSideProps";
import { buildLegacyCtx } from "@lib/buildLegacyCtx";

const normalizePages = (pages: string[] | string | undefined) => {
  const normalizedPages = Array.isArray(pages) ? pages : pages?.split("/") ?? [];
  return {
    mainPage: normalizedPages[0],
    subPages: normalizedPages.slice(1),
  };
};

export const generateMetadata = async ({ params }: { params: { pages: string[] } }) => {
  const { mainPage } = normalizePages(params.pages);
  return await _generateMetadata(
    // TODO: Need to show the actual form name instead of "Form"
    (t) => (mainPage === "routing-link" ? `Form | Cal.com Forms` : `${t("routing_forms")} | Cal.com Forms`),
    () => ""
  );
};

type GetServerSidePropsResult =
  (typeof routingServerSidePropsConfig)[keyof typeof routingServerSidePropsConfig];
const getData = withAppDirSsr<GetServerSidePropsResult>(getServerSideProps);

const ServerPage = async ({ params, searchParams }: ServerPageProps) => {
  const context = buildLegacyCtx(headers(), cookies(), params, searchParams);
  const props = await getData(context);
  const { mainPage, subPages } = normalizePages(params.pages);

  const componentProps = {
    ...props,
    pages: subPages,
  };

  if (mainPage === "routing-link") {
    return <LayoutHandler {...componentProps} />;
  }

  return (
    <Shell withoutMain withoutSeo>
      <LayoutHandler {...componentProps} />
    </Shell>
  );
};

export default ServerPage;
