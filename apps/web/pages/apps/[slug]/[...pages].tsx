import { GetServerSidePropsContext } from "next";
import { NextRouter, useRouter } from "next/router";

import RoutingFormsRoutingConfig from "@calcom/app-store/ee/routing_forms/pages/app-routing.config";
import TypeformRoutingConfig from "@calcom/app-store/typeform/pages/app-routing.config";
import prisma from "@calcom/prisma";
import { AppGetServerSideProps } from "@calcom/types/AppGetServerSideProps";
import { inferSSRProps } from "@calcom/types/inferSSRProps";

import { getSession } from "@lib/auth";

type AppPage = {
  getServerSideProps: AppGetServerSideProps;
  // A component than can accept any properties
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  default: ((props: any) => JSX.Element) & { isThemeSupported?: boolean };
};

type Found = {
  notFound: false;
  Component: AppPage["default"];
  getServerSideProps: AppPage["getServerSideProps"];
};

type NotFound = {
  notFound: true;
};

// TODO: It is a candidate for apps.*.generated.*
const AppsRouting = {
  routing_forms: RoutingFormsRoutingConfig,
  typeform: TypeformRoutingConfig,
};

function getRoute(appName: string, pages: string[]) {
  const routingConfig = AppsRouting[appName as keyof typeof AppsRouting] as Record<string, AppPage>;

  if (!routingConfig) {
    return {
      notFound: true,
    } as NotFound;
  }
  const mainPage = pages[0];
  const appPage = routingConfig[mainPage] as AppPage;

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

  const componentProps = {
    ...props,
    pages: pages.slice(1),
  };

  if (!route || route.notFound) {
    throw new Error("Route can't be undefined");
  }
  return <route.Component {...componentProps} />;
}

AppPage.isThemeSupported = ({ router }: { router: NextRouter }) => {
  const route = getRoute(router.query.slug as string, router.query.pages as string[]);
  if (route.notFound) {
    return false;
  }
  return route.Component.isThemeSupported;
};

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
    const session = await getSession({ req: context.req });
    const user = session?.user;

    const result = await route.getServerSideProps(
      context as GetServerSidePropsContext<{
        slug: string;
        pages: string[];
        appPages: string[];
      }>,
      prisma,
      user
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
        appUrl: `/apps/${appName}`,
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
