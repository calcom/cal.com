import type { GetServerSidePropsContext, GetServerSidePropsResult } from "next";
import { z } from "zod";

import { getAppWithMetadata } from "@calcom/app-store/_appRegistry";
import RoutingFormsRoutingConfig from "@calcom/app-store/routing-forms/pages/app-routing.config";
import TypeformRoutingConfig from "@calcom/app-store/typeform/pages/app-routing.config";
import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import prisma from "@calcom/prisma";
import type { AppGetServerSideProps } from "@calcom/types/AppGetServerSideProps";

import type { AppProps } from "@lib/app-providers";

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

const paramsSchema = z.object({
  slug: z.string(),
  pages: z.array(z.string()),
});

export async function getServerSideProps(
  context: GetServerSidePropsContext
): Promise<GetServerSidePropsResult<any>> {
  const { params, req } = context;
  if (!params) {
    return {
      notFound: true,
    };
  }

  const parsedParams = paramsSchema.safeParse(params);
  if (!parsedParams.success) {
    return {
      notFound: true,
    };
  }

  const appName = parsedParams.data.slug;
  const pages = parsedParams.data.pages;
  const route = getRoute(appName, pages);

  if (route.notFound) {
    return { notFound: true };
  }

  if (route.getServerSideProps) {
    // TODO: Document somewhere that right now it is just a convention that filename should have appPages in it's name.
    // appPages is actually hardcoded here and no matter the fileName the same variable would be used.
    // We can write some validation logic later on that ensures that [...appPages].tsx file exists
    params.appPages = pages.slice(1);
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
