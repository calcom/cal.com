import type { GetServerSidePropsContext, GetServerSidePropsResult } from "next";
import { z } from "zod";

import RoutingFormsRoutingConfig from "@calcom/app-store/routing-forms/pages/app-routing.config";
import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import prisma from "@calcom/prisma";
import type { AppGetServerSideProps } from "@calcom/types/AppGetServerSideProps";

import type { AppProps } from "@lib/app-providers";

import { ssrInit } from "@server/lib/ssr";

type RoutingPageType = {
  getServerSideProps?: AppGetServerSideProps;
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
  const routingConfig = RoutingFormsRoutingConfig as Record<string, RoutingPageType>;

  if (!routingConfig) {
    return {
      notFound: true,
    } as NotFound;
  }
  const mainPage = pages[0];
  const appPage = routingConfig.layoutHandler || (routingConfig[mainPage] as RoutingPageType);
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

  const pages = parsedParams.data.pages;
  const route = getRoute(pages);

  if (route.notFound || !route.getServerSideProps) {
    return { notFound: true };
  }

  params.appPages = pages.slice(1);
  const session = await getServerSession({ req });
  const user = session?.user;

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
      ...result.props,
    },
  };
}
