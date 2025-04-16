import { withAppDirSsr } from "app/WithAppDirSsr";
import type { PageProps as ServerPageProps } from "app/_types";
import { _generateMetadata } from "app/_utils";
import { cookies, headers } from "next/headers";

import { routingFormsComponents } from "@calcom/app-store/routing-forms/pages/app-routing.client-config";
import type { routingServerSidePropsConfig } from "@calcom/app-store/routing-forms/pages/app-routing.server-config";
import Shell from "@calcom/features/shell/Shell";

import { getServerSideProps } from "@lib/apps/routing-forms/[...pages]/getServerSideProps";
import { buildLegacyCtx } from "@lib/buildLegacyCtx";

import FormProvider from "./FormProvider";

const normalizePages = (pages: string[] | string | undefined) => {
  const normalizedPages = Array.isArray(pages) ? pages : pages?.split("/") ?? [];
  return {
    mainPage: normalizedPages[0] ?? "forms",
    subPages: normalizedPages.slice(1),
  };
};

export const generateMetadata = async ({ params }: { params: Promise<{ pages: string[] }> }) => {
  const { mainPage } = normalizePages((await params).pages);
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
  const context = buildLegacyCtx(await headers(), await cookies(), await params, await searchParams);
  const props = await getData(context);
  const { mainPage } = normalizePages((await params).pages);

  const Component = await routingFormsComponents[mainPage as keyof typeof routingFormsComponents]();
  const FinalComponent = () => (
    <FormProvider>
      <Component {...(props as any)} />
    </FormProvider>
  );

  if (mainPage === "routing-link") {
    return <FinalComponent />;
  }

  return (
    <Shell withoutMain>
      <FinalComponent />
    </Shell>
  );
};

export default ServerPage;
