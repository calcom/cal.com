import { withAppDirSsr } from "app/WithAppDirSsr";
import type { PageProps as ServerPageProps } from "app/_types";
import { _generateMetadata } from "app/_utils";
import { cookies, headers } from "next/headers";

import { getServerSideProps } from "@lib/apps/routing-forms/[...pages]/getServerSideProps";
import { buildLegacyCtx } from "@lib/buildLegacyCtx";

import { routingFormsComponents } from "./app-routing.client-config";

const normalizePages = (pages: string[] | string | undefined) => {
  const normalizedPages = Array.isArray(pages) ? pages : pages?.split("/") ?? [];
  return normalizedPages[0];
};

export const generateMetadata = async ({ params }: { params: Promise<{ pages: string[] }> }) => {
  const mainPage = normalizePages((await params).pages);
  return await _generateMetadata(
    (t) => (mainPage === "routing-link" ? `Form | Cal.com Forms` : `${t("routing_forms")} | Cal.com Forms`),
    () => "",
    undefined,
    undefined,
    `/routing/${(await params).pages.join("/")}`
  );
};

const getData = withAppDirSsr(getServerSideProps);

const ServerPage = async ({ params, searchParams }: ServerPageProps) => {
  const context = buildLegacyCtx(await headers(), await cookies(), await params, await searchParams);
  const props = await getData(context);
  const mainPage = normalizePages((await params).pages);

  const Component = await routingFormsComponents[mainPage as keyof typeof routingFormsComponents]();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Dynamic component selection makes type-safe props casting impractical
  return <Component {...(props as any)} />;
};

export default ServerPage;
