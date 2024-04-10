import LegacyPage, { getLayout } from "@pages/apps/[slug]/[...pages]";
import type { PageProps, SearchParams } from "app/_types";
import { _generateMetadata } from "app/_utils";
import type { GetServerSidePropsContext } from "next";
import type { Params } from "next/dist/shared/lib/router/utils/route-matcher";
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
import { buildLegacyCtx } from "@lib/buildLegacyCtx";

import PageWrapper from "@components/PageWrapperAppDir";

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

const AppsRouting = {
  "routing-forms": RoutingFormsRoutingConfig,
  typeform: TypeformRoutingConfig,
};

const paramsSchema = z.object({
  slug: z.string(),
  pages: z.array(z.string()),
});

export const generateMetadata = async ({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SearchParams;
}) => {
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

  const legacyContext = buildLegacyCtx(
    headers(),
    cookies(),
    params,
    searchParams
  ) as unknown as GetServerSidePropsContext;
  const { form } = await getPageProps(legacyContext);

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

const getPageProps = async ({ params, query, req }: GetServerSidePropsContext) => {
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
    params!.appPages = pages.slice(1);

    const ctx = { req, params, query };

    const session = await getServerSession({ req });
    const user = session?.user;
    const app = await getAppWithMetadata({ slug: appName });

    if (!app) {
      notFound();
    }

    const result = await route.getServerSideProps(
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

export default async function Page({ params, searchParams }: PageProps) {
  const h = headers();
  const nonce = h.get("x-nonce") ?? undefined;

  const legacyContext = buildLegacyCtx(
    h,
    cookies(),
    params,
    searchParams
  ) as unknown as GetServerSidePropsContext;
  const props = await getPageProps(legacyContext);
  return (
    <PageWrapper getLayout={getLayout} requiresLicense={false} nonce={nonce} themeBasis={null} {...props}>
      <LegacyPage {...props} />
    </PageWrapper>
  );
}
