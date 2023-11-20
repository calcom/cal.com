import React from "react";

import RoutingFormsRoutingConfig from "@calcom/app-store/routing-forms/pages/app-routing.config";
import TypeformRoutingConfig from "@calcom/app-store/typeform/pages/app-routing.config";
import { useParamsWithFallback } from "@calcom/lib/hooks/useParamsWithFallback";

import type { AppProps } from "@lib/app-providers";

import PageWrapper from "@components/PageWrapper";

type AppPageType = {
  // A component than can accept any properties
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  default: ((props: any) => JSX.Element) &
    Pick<AppProps["Component"], "isBookingPage" | "getLayout" | "PageWrapper">;
};

type Found = {
  notFound: false;
  Component: AppPageType["default"];
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
  const routingConfig = AppsRouting[appName as keyof typeof AppsRouting] as Record<string, AppPageType>;

  if (!routingConfig) {
    return {
      notFound: true,
    } as NotFound;
  }
  const mainPage = pages[0];
  const appPage = routingConfig.layoutHandler || (routingConfig[mainPage] as AppPageType);

  if (!appPage) {
    return {
      notFound: true,
    } as NotFound;
  }
  return { notFound: false, Component: appPage.default } as Found;
}

const AppPage: AppPageType["default"] = function AppPage(props) {
  const params = useParamsWithFallback() as { slug: string; pages?: string[] };
  const appName = params.slug;
  const pages = params.pages ?? [];
  const route = getRoute(appName, pages);

  const componentProps = {
    ...props,
    appName,
    pages: pages.slice(1),
  };

  if (!route || route.notFound) {
    throw new Error("Route can't be undefined");
  }
  return <route.Component {...componentProps} />;
};

AppPage.isBookingPage = ({ router }) => {
  const route = getRoute(router.query.slug as string, router.query.pages as string[]);
  if (route.notFound) {
    return false;
  }
  const isBookingPage = route.Component.isBookingPage;
  if (typeof isBookingPage === "function") {
    return isBookingPage({ router });
  }

  return !!isBookingPage;
};

AppPage.getLayout = (page, router) => {
  const route = getRoute(router.query.slug as string, router.query.pages as string[]);
  if (route.notFound) {
    return null;
  }
  if (!route.Component.getLayout) {
    return page;
  }
  return route.Component.getLayout(page, router);
};

AppPage.PageWrapper = PageWrapper;

export default AppPage;
