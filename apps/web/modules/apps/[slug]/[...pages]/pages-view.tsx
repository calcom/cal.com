"use client";

import RoutingFormsRoutingConfig from "@calcom/app-store/routing-forms/pages/app-routing.config";
import TypeformRoutingConfig from "@calcom/app-store/typeform/pages/app-routing.config";
import Shell from "@calcom/features/shell/Shell";
import { useParamsWithFallback } from "@calcom/lib/hooks/useParamsWithFallback";
import type { AppGetServerSideProps } from "@calcom/types/AppGetServerSideProps";
import type { inferSSRProps } from "@calcom/types/inferSSRProps";

import type { AppProps } from "@lib/app-providers";
import type { getServerSideProps } from "@lib/apps/[slug]/[...pages]/getServerSideProps";

type AppPageType = {
  getServerSideProps: AppGetServerSideProps;
  // A component than can accept any properties
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  default: ((props: any) => JSX.Element) & Pick<AppProps["Component"], "isBookingPage" | "PageWrapper">;
};

type Found = {
  notFound: false;
  Component: AppPageType["default"];
  getServerSideProps: AppPageType["getServerSideProps"];
};

type NotFound = {
  notFound: true;
};

// TODO: It is a candidate for apps.*.generated.*
const AppsRouting = {
  "routing-forms": RoutingFormsRoutingConfig,
  typeform: TypeformRoutingConfig,
};

function getRoute(appName: string, pages: string[]) {
  const routingConfig = AppsRouting[appName as keyof typeof AppsRouting] as unknown as Record<
    string,
    AppPageType
  >;

  const mainPage = pages[0];
  const appPage = routingConfig.layoutHandler || (routingConfig[mainPage] as AppPageType);
  if (!appPage) {
    return {
      notFound: true,
    } as NotFound;
  }
  return { notFound: false, Component: appPage.default, ...appPage } as Found;
}
export type PageProps = inferSSRProps<typeof getServerSideProps>;

function AppPage(props: PageProps) {
  const appName = props.appName;
  const params = useParamsWithFallback();
  const pages = Array.isArray(params.pages) ? params.pages : params.pages?.split("/") ?? [];

  if (appName !== "routing-forms" && appName !== "typeform") {
    throw new Error("slug should be routing-forms or typeform");
  }

  const route = getRoute(appName, pages);

  if (!route || route.notFound) {
    throw new Error("Route can't be undefined");
  }

  const componentProps = {
    ...props,
    pages: pages.slice(1),
  };
  const component = <route.Component {...componentProps} />;

  if (appName === "routing-forms") {
    return (
      <Shell backPath="/apps/routing-forms/forms" withoutMain withoutSeo>
        {component}
      </Shell>
    );
  }
  return component;
}

export default AppPage;
