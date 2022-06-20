import { GetServerSidePropsContext } from "next";
import { useRouter } from "next/router";

import RoutingFormsRoutingConfig from "@calcom/app-store/routing_forms/pages/app-routing.config";
import prisma from "@calcom/prisma";
import { inferSSRProps } from "@calcom/types/inferSSRProps";

// TODO: It is a candidate for apps.*.generated.*
const AppsRouting = {
  routing_forms: RoutingFormsRoutingConfig,
};

function getRoute(appName: string, pages: string[]) {
  const routingConfig = AppsRouting[appName as keyof typeof AppsRouting];
  type NotFound = {
    notFound: true;
  };

  if (!routingConfig) {
    return {
      notFound: true,
    } as NotFound;
  }

  const mainPage = pages[0];
  const appPage = routingConfig[mainPage as keyof typeof routingConfig];
  type Found = {
    notFound: false;
    // A component than can accept any properties
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Component: (props: any) => JSX.Element;
    getServerSideProps: typeof appPage["getServerSideProps"];
  };
  if (!appPage) {
    return {
      notFound: true,
    } as NotFound;
  }
  return { notFound: false, Component: appPage.default, ...appPage } as Found;
}

export default function AppPage(props: inferSSRProps<typeof getServerSideProps>) {
  const appName = props.appName;
  const router = useRouter();
  const pages = router.query.pages as string[];
  const route = getRoute(appName, pages);

  props = {
    ...props,
    pages: pages.slice(1),
  };

  if (!route || route.notFound) {
    throw new Error("Route can't be undefined");
  }
  return <route.Component {...props} />;
}

export async function getServerSideProps(
  context: GetServerSidePropsContext<{
    slug: string;
    pages: string[];
    appPages?: string[];
  }>
) {
  const { params } = context;
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

    const result = await route.getServerSideProps(
      context as GetServerSidePropsContext<{
        slug: string;
        pages: string[];
        appPages: string[];
      }>,
      prisma
    );
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    //@ts-ignore
    if (result.notFound) {
      return result;
    }
    return {
      props: {
        appName,
        pages,
        appUrl: `/apps/${appName}`,
        ...result.props,
      },
    };
  } else {
    return {
      props: {
        appName,
        pages,
      },
    };
  }
}

export type AppPrisma = typeof prisma;
export type AppGetServerSidePropsContext = GetServerSidePropsContext<{
  appPages: string[];
}>;
