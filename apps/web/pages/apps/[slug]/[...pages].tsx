"use client";

import type { GetServerSidePropsContext } from "next";

import { getAppWithMetadata } from "@calcom/app-store/_appRegistry";
import RoutingFormsRoutingConfig from "@calcom/app-store/routing-forms/pages/app-routing.config";
import TypeformRoutingConfig from "@calcom/app-store/typeform/pages/app-routing.config";
import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import { useParamsWithFallback } from "@calcom/lib/hooks/useParamsWithFallback";
import prisma from "@calcom/prisma";
import type { AppGetServerSideProps } from "@calcom/types/AppGetServerSideProps";

import type { AppProps } from "@lib/app-providers";

import PageWrapper from "@components/PageWrapper";

import { ssrInit } from "@server/lib/ssr";

type AppPageType = {
  getServerSideProps: AppGetServerSideProps;
  // A component than can accept any properties
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  default: ((props: any) => JSX.Element) &
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
  return { notFound: false, Component: appPage.default, ...appPage } as Found;
}

const AppPage: AppPageType["default"] = function AppPage(props) {
  const appName = props.appName;
  const params = useParamsWithFallback();
  const pages = Array.isArray(params.pages) ? params.pages : params.pages?.split("/") ?? [];
  const route = getRoute(appName, pages);

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

export const getLayout: NonNullable<(typeof AppPage)["getLayout"]> = (page) => {
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const { slug, pages } = useParamsWithFallback();
  const route = getRoute(slug as string, pages as string[]);

  if (route.notFound) {
    return null;
  }
  if (!route.Component.getLayout) {
    return page;
  }
  return route.Component.getLayout(page);
};

AppPage.PageWrapper = PageWrapper;
AppPage.getLayout = getLayout;

export default AppPage;

export async function getServerSideProps(
  context: GetServerSidePropsContext<{
    slug: string;
    pages: string[];
    appPages?: string[];
  }>
) {
  const { params, req, res } = context;
  if (!params) {
    return {
      notFound: true,
    };
  }
  const appName = params.slug;
  const pages = params.pages;
  const route = getRoute(appName, pages);
  if (route.notFound) {
    return route;
  }
  if (route.getServerSideProps) {
    // TODO: Document somewhere that right now it is just a convention that filename should have appPages in it's name.
    // appPages is actually hardcoded here and no matter the fileName the same variable would be used.
    // We can write some validation logic later on that ensures that [...appPages].tsx file exists
    params.appPages = pages.slice(1);
    const session = await getServerSession({ req, res });
    const user = session?.user;
    const app = await getAppWithMetadata({ slug: appName });
    if (!app) {
      return {
        notFound: true,
      };
    }

    const result = await route.getServerSideProps(
      context as GetServerSidePropsContext<{
        slug: string;
        pages: string[];
        appPages: string[];
      }>,
      prisma,
      user,
      ssrInit
    );
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    //@ts-ignore
    if (result.notFound) {
      return {
        notFound: true,
      };
    }
    if (result.redirect) {
      return {
        redirect: result.redirect,
      };
    }
    return {
      props: {
        appName,
        appUrl: app.simplePath || `/apps/${appName}`,
        ...result.props,
      },
    };
  } else {
    return {
      props: {
        appName,
      },
    };
  }
}
