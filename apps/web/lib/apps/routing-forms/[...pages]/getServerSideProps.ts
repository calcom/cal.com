import type { GetServerSidePropsContext, GetServerSidePropsResult } from "next";
import { z } from "zod";

import { getAppWithMetadata } from "@calcom/app-store/_appRegistry";
import { routingServerSidePropsConfig } from "@calcom/app-store/routing-forms/pages/app-routing.config";
import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import prisma from "@calcom/prisma";
import type { AppGetServerSideProps } from "@calcom/types/AppGetServerSideProps";

import type { AppProps } from "@lib/app-providers";

import { ssrInit } from "@server/lib/ssr";

type AppPageType = {
  getServerSideProps?: AppGetServerSideProps;
  // A component than can accept any properties
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  default: ((props: any) => JSX.Element) &
    Pick<AppProps["Component"], "isBookingPage" | "getLayout" | "PageWrapper">;
};

type Found = {
  notFound: false;
  getServerSideProps: AppPageType["getServerSideProps"];
};

type NotFound = {
  notFound: true;
};

function getRoute(pages: string[]) {
  const mainPage = pages[0];
  const getServerSideProps = routingServerSidePropsConfig[mainPage];

  if (!getServerSideProps) {
    return {
      notFound: true,
    } as NotFound;
  }
  return { notFound: false, getServerSideProps } as Found;
}

const paramsSchema = z.object({
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

  const session = await getServerSession({ req });
  const user = session?.user;
  const app = await getAppWithMetadata({ slug: "routing-forms" });

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
      appUrl: app.simplePath || `/apps/routing-forms`,
      ...result.props,
    },
  };
}
