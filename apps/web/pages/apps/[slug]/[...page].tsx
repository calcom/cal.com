import { useRouter } from "next/router";

import RoutingFormsRoutingConfig from "@calcom/app-store/routing-forms/pages/routing.config";

const AppsRouting = {
  "routing-forms": RoutingFormsRoutingConfig,
};

function Page404() {
  return <div>404</div>;
}

function getComponent(appName, page) {
  const routingConfig = AppsRouting[appName];
  const mainPage = page[0];
  const props = { subPages: page.slice(1), Page404 };
  const Component = routingConfig[mainPage];
  if (Component) {
    return { props, Component };
  }
  return { props, Component: Page404 };
}

export default function AppPage() {
  const router = useRouter();
  const appName = router.query.slug;
  const page = router.query.page;
  if (!router.query.slug) {
    return null;
  }
  const { props, Component } = getComponent(appName, page);
  return <Component {...props} />;
}
