import { GetServerSidePropsContext } from "next";
import { useRouter } from "next/router";

import RoutingFormsRoutingConfig from "@calcom/app-store/ee/routing_forms/pages/app-routing.config";
import prisma from "@calcom/prisma";
import { AppGetServerSideProps } from "@calcom/types/AppGetServerSideProps";
import { inferSSRProps } from "@calcom/types/inferSSRProps";

import { getSession } from "@lib/auth";

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
    getServerSideProps: AppGetServerSideProps;
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

  const componentProps = {
    ...props,
    pages: pages.slice(1),
  };

  if (!route || route.notFound) {
    throw new Error("Route can't be undefined");
  }
  return <route.Component {...componentProps} />;
}

AppPage.isThemeSupported = true;

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
