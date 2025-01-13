import type { GetServerSidePropsContext, GetServerSidePropsResult } from "next";
import { z } from "zod";

import { getAppWithMetadata } from "@calcom/app-store/_appRegistry";
import { routingServerSidePropsConfig } from "@calcom/app-store/routing-forms/pages/app-routing-server.config";
import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import { prisma } from "@calcom/prisma";
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
  getServerSideProps: RoutingPageType["getServerSideProps"];
};

type NotFound = {
  notFound: true;
};

function getRoute(pages: string[]) {
  const mainPage = pages[0];
  const getServerSideProps = routingServerSidePropsConfig[mainPage] as RoutingPageType["getServerSideProps"];

  if (!getServerSideProps || typeof getServerSideProps !== "function") {
    return {
      notFound: true,
    } as NotFound;
  }
  return { notFound: false, getServerSideProps } as Found;
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
  const route = getRoute(pages);

  if (route.notFound) {
    return { notFound: true };
  }

  if (route.getServerSideProps) {
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
        appUrl: app.simplePath,
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
