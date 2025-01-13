"use client";

import { useParams } from "next/navigation";

import RoutingFormsRoutingConfig from "@calcom/app-store/routing-forms/pages/app-routing.config";
import type { AppGetServerSideProps } from "@calcom/types/AppGetServerSideProps";
import type { inferSSRProps } from "@calcom/types/inferSSRProps";

import type { AppProps } from "@lib/app-providers";
import type { getServerSideProps } from "@lib/apps/[slug]/[...pages]/getServerSideProps";

type RoutingPageType = {
  getServerSideProps: AppGetServerSideProps;
  // A component than can accept any properties
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  default: ((props: any) => JSX.Element) &
    Pick<AppProps["Component"], "isBookingPage" | "getLayout" | "PageWrapper">;
};

type Found = {
  notFound: false;
  Component: RoutingPageType["default"];
  getServerSideProps: RoutingPageType["getServerSideProps"];
};

type NotFound = {
  notFound: true;
};

function getRoute(pages: string[]) {
  const routingConfig = RoutingFormsRoutingConfig as unknown as Record<string, RoutingPageType>;
  const mainPage = pages[0];
  const appPage = routingConfig.layoutHandler || (routingConfig[mainPage] as RoutingPageType);
  if (!appPage) {
    return {
      notFound: true,
    } as NotFound;
  }
  return { notFound: false, Component: appPage.default, ...appPage } as Found;
}
export type PageProps = inferSSRProps<typeof getServerSideProps>;

const RoutingFormsPage: RoutingPageType["default"] = function RoutingFormsPage(props: PageProps) {
  const params = useParams();
  const _pages = params?.pages ?? [];
  const pages = Array.isArray(_pages) ? _pages : _pages.split("/");
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

export const getLayout: NonNullable<(typeof RoutingFormsPage)["getLayout"]> = (page) => {
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const params = useParams();
  const _pages = params?.pages ?? [];
  const pages = Array.isArray(_pages) ? _pages : _pages.split("/");
  const route = getRoute(pages as string[]);

  if (route.notFound) {
    return null;
  }
  if (!route.Component.getLayout) {
    return page;
  }
  return route.Component.getLayout(page);
};

export default RoutingFormsPage;
