import { GetServerSidePropsContext } from "next";
import { useRouter } from "next/router";

import RoutingFormsRoutingConfig from "@calcom/app-store/routing_forms/pages/app-routing.config";
import prisma from "@calcom/prisma";

// TODO: It is a candidate for apps.*.generated.*
const AppsRouting = {
  routing_forms: RoutingFormsRoutingConfig,
};

function Page404() {
  return <div>404</div>;
}

function getRoute(appName, pages) {
  const routingConfig = AppsRouting[appName];
  if (!routingConfig) {
    return {
      notFound: true,
    };
  }
  const mainPage = pages[0];
  const appPage = routingConfig[mainPage];
  if (!appPage) {
    return {
      notFound: true,
    };
  }
  return { Component: appPage.default, ...appPage };
}

export default function AppPage(props) {
  const router = useRouter();
  const appName = router.query.slug;
  const pages = router.query.pages;
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

export async function getServerSideProps(context: GetServerSidePropsContext) {
  const { query } = context;
  const appName = query.slug;
  const pages = query.pages || [];
  const route = getRoute(appName, pages);
  if (route.notFound) {
    return route;
  }
  if (route.getServerSideProps) {
    // TODO: Document somewhere that right now it is just a convention that filename should have appPages in it's name.
    // appPages is actually hardcoded here and no matter the fileName the same variable would be used.
    // We can write some validation logic later on that ensures that [...appPages].tsx file exists
    query.appPages = query.pages.slice(1);
    const result = await route.getServerSideProps(context, prisma);
    result.props = {
      ...result.props,
      appUrl: `/apps/${appName}`,
    };
    return result;
  } else {
    return {
      props: {},
    };
  }
}
