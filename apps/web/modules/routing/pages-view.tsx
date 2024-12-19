"use client";

import RoutingFormsRoutingConfig from "@calcom/app-store/routing-forms/pages/app-routing.config";
import { useParamsWithFallback } from "@calcom/lib/hooks/useParamsWithFallback";
import type { AppGetServerSideProps } from "@calcom/types/AppGetServerSideProps";

import type { AppProps } from "@lib/app-providers";
import type { PageProps } from "@lib/routing/[pages]/getServerSideProps";

type AppPageType = {
  getServerSideProps: AppGetServerSideProps;
  default: ((props: PageProps) => JSX.Element) &
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

function getRoute() {
  const routingConfig = RoutingFormsRoutingConfig;

  const appPage = routingConfig.layoutHandler;
  if (!appPage) {
    return {
      notFound: true,
    } as NotFound;
  }
  return { notFound: false, Component: appPage.default, ...appPage } as Found;
}

const AppPage: AppPageType["default"] = function AppPage(props: PageProps) {
  const params = useParamsWithFallback();
  const pages = Array.isArray(params.pages) ? params.pages : params.pages?.split("/") ?? [];
  const route = getRoute();

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
  const route = getRoute();
  if (route.notFound) {
    return false;
  }
  const isBookingPage = route.Component.isBookingPage;
  if (typeof isBookingPage === "function") {
    return isBookingPage({ router });
  }

  return !!isBookingPage;
};

export const getLayout: NonNullable<(typeof AppPage)["getLayout"]> = (page) => {
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const route = getRoute();

  if (route.notFound) {
    return null;
  }
  if (!route.Component.getLayout) {
    return page;
  }
  return route.Component.getLayout(page);
};

export default AppPage;
