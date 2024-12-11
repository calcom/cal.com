import type { GetServerSidePropsContext } from "next";

import { getAppWithMetadata } from "@calcom/app-store/_appRegistry";
import RoutingFormsRoutingConfig from "@calcom/app-store/routing-forms/pages/app-routing.config";
import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import prisma from "@calcom/prisma";
import type { AppGetServerSideProps } from "@calcom/types/AppGetServerSideProps";

import type { AppProps } from "@lib/app-providers";

import { ssrInit } from "@server/lib/ssr";

type AppPageType = {
  getServerSideProps?: AppGetServerSideProps;
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

export const getServerSideProps = async (context: GetServerSidePropsContext) => {
  const { req } = context;
  const appName = "routing-forms";
  const pages = ["forms"]; // set forms page to be the default one
  const route = getRoute(pages);

  if (route.notFound) {
    return { notFound: true };
  }

  if (route.getServerSideProps) {
    const session = await getServerSession({ req });
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

    if (result.notFound) {
      return { notFound: true };
    }

    if (result.redirect) {
      return { redirect: result.redirect };
    }

    return {
      props: {
        appName,
        appUrl: "/apps/routing-forms",
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
};
