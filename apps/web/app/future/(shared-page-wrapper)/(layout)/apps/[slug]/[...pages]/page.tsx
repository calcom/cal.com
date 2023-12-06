import LegacyPage from "@pages/apps/[slug]/[...pages]";
import { ssrInit } from "app/_trpc/ssrInit";
import { _generateMetadata } from "app/_utils";
import type { GetServerSidePropsContext } from "next";
import { cookies, headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import z from "zod";

import { getAppWithMetadata } from "@calcom/app-store/_appRegistry";
import RoutingFormsRoutingConfig, {
  serverSidePropsConfig,
} from "@calcom/app-store/routing-forms/pages/app-routing.config";
import TypeformRoutingConfig from "@calcom/app-store/typeform/pages/app-routing.config";
import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import { APP_NAME } from "@calcom/lib/constants";
import prisma from "@calcom/prisma";
import type { AppGetServerSideProps } from "@calcom/types/AppGetServerSideProps";

import type { AppProps } from "@lib/app-providers";
import { getQuery } from "@lib/getQuery";

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

const AppsRouting = {
  "routing-forms": RoutingFormsRoutingConfig,
  typeform: TypeformRoutingConfig,
};

const paramsSchema = z.object({
  slug: z.string(),
  pages: z.array(z.string()),
});

export const generateMetadata = async ({ params }: { params: Record<string, string | string[]> }) => {
  const p = paramsSchema.safeParse(params);

  if (!p.success) {
    return notFound();
  }

  const mainPage = p.data.pages[0];

  if (mainPage === "forms") {
    return await _generateMetadata(
      () => `Forms | ${APP_NAME}`,
      () => ""
    );
  }

  const { form } = await getPageProps({ params });

  return await _generateMetadata(
    () => `${form.name} | ${APP_NAME}`,
    () => form.description
  );
};

function getRoute(appName: string, pages: string[]) {
  const routingConfig = AppsRouting[appName as keyof typeof AppsRouting] as Record<string, AppPageType>;

  if (!routingConfig) {
    notFound();
  }

  const mainPage = pages[0];
  const appPage = routingConfig.layoutHandler || (routingConfig[mainPage] as AppPageType);

  const getServerSidePropsHandler = serverSidePropsConfig[mainPage];

  if (!appPage) {
    notFound();
  }

  return {
    notFound: false,
    Component: appPage.default,
    ...appPage,
    getServerSideProps: getServerSidePropsHandler,
  } as Found;
}

const getPageProps = async ({ params }: { params: Record<string, string | string[]> }) => {
  const p = paramsSchema.safeParse(params);

  if (!p.success) {
    return notFound();
  }

  const { slug: appName, pages } = p.data;

  const route = getRoute(appName, pages);

  if (route.notFound) {
    return route;
  }

  if (route.getServerSideProps) {
    // TODO: Document somewhere that right now it is just a convention that filename should have appPages in it's name.
    // appPages is actually hardcoded here and no matter the fileName the same variable would be used.
    // We can write some validation logic later on that ensures that [...appPages].tsx file exists
    params.appPages = pages.slice(1);

    const req = { headers: headers(), cookies: cookies() };
    const query = getQuery(req.headers.get("x-url") ?? "", params);

    const ctx = { req, params, query };

    const session = await getServerSession({ req });
    const user = session?.user;
    const app = await getAppWithMetadata({ slug: appName });

    if (!app) {
      notFound();
    }

    const result = await route.getServerSideProps(
      // @ts-expect-error req
      {
        ...ctx,
        params: {
          ...ctx.params,
          appPages: pages.slice(1),
        },
      } as GetServerSidePropsContext<{
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
      notFound();
    }

    if (result.redirect) {
      redirect(result.redirect.destination);
    }

    return {
      appName,
      appUrl: app.simplePath || `/apps/${appName}`,
      ...result.props,
    };
  } else {
    return {
      appName,
    };
  }
};

export default async function Page({ params }: { params: Record<string, string | string[]> }) {
  const pageProps = await getPageProps({ params });
  return <LegacyPage {...pageProps} />;
}
