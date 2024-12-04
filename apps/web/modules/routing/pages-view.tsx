"use client";

import RoutingFormsRoutingConfig from "@calcom/app-store/routing-forms/pages/app-routing.config";
import { useParamsWithFallback } from "@calcom/lib/hooks/useParamsWithFallback";
import type { AppGetServerSideProps } from "@calcom/types/AppGetServerSideProps";
import type { inferSSRProps } from "@calcom/types/inferSSRProps";

import type { AppProps } from "@lib/app-providers";
import type { getServerSideProps } from "@lib/apps/[slug]/[...pages]/getServerSideProps";

type AppPageType = {
  getServerSideProps: AppGetServerSideProps;
  // A component than can accept any properties
  default: ((props: unknown) => JSX.Element) &
    Pick<AppProps["Component"], "isBookingPage" | "getLayout" | "PageWrapper">;
};

type Found = {
  notFound: false;
  Component: AppPageType["default"];
  getServerSideProps: AppPageType["getServerSideProps"];
};

type NotFound = {
  notFound: true;
};

function getRoute(pages: string[]) {
  const mainPage = pages[0] as keyof typeof RoutingFormsRoutingConfig;
  const appPage =
    RoutingFormsRoutingConfig.layoutHandler || (RoutingFormsRoutingConfig[mainPage] as AppPageType);
  if (!appPage) {
    return {
      notFound: true,
    } as NotFound;
  }
  return { notFound: false, Component: appPage.default, ...appPage } as Found;
}

export type PageProps = inferSSRProps<typeof getServerSideProps>;

const AppPage: AppPageType["default"] = function AppPage(props: PageProps) {
  const params = useParamsWithFallback();
  const defaultPage = ["forms"];
  const pages = Array.isArray(params.pages) ? params.pages : params.pages?.split("/") ?? defaultPage;

  const route = getRoute(pages);

  const componentProps = {
    ...props,
    pages: pages.slice(1),
  };

  if (!route || route.notFound) {
    throw new Error("Route can't be undefined");
  }
  return <route.Component {...componentProps} />;
};

AppPage.isBookingPage = ({ router }) => {
  const route = getRoute(router.query.pages as string[]);
  if (route.notFound) {
    return false;
  }
  const isBookingPage = route.Component.isBookingPage;
  if (typeof isBookingPage === "function") {
    return isBookingPage({ router });
  }

  return !!isBookingPage;
};

export const GetFormLayout: NonNullable<(typeof AppPage)["getLayout"]> = (page) => {
  const { pages: paramsPages } = useParamsWithFallback();
  const defaultPage = ["forms"];
  const pages = paramsPages?.length ? (paramsPages as string[]) : defaultPage;
  const route = getRoute(pages);

  if (route.notFound) {
    return null;
  }
  if (!route.Component.getLayout) {
    return page;
  }
  return route.Component.getLayout(page);
};

export default AppPage;
