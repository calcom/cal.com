import type { GetServerSidePropsContext } from "next";
import type { NextRouter } from "next/router";
import { useRouter } from "next/router";
import React from "react";
import { useForm, FormProvider } from "react-hook-form";

import type { AppPrisma, AppSsrInit, AppUser } from "@calcom/types/AppGetServerSideProps";

import type { AppProps } from "@lib/app-providers";

import RoutingFormsRoutingConfig from "../app-routing.config";

type GetServerSidePropsRestArgs = [AppPrisma, AppUser, AppSsrInit];
type Component = {
  default: React.ComponentType & Pick<AppProps["Component"], "getLayout">;
  getServerSideProps?: (context: GetServerSidePropsContext, ...rest: GetServerSidePropsRestArgs) => void;
};
const getComponent = (route: string | NextRouter): Component => {
  const defaultRoute = "forms";
  const routeKey =
    typeof route === "string" ? route || defaultRoute : route?.query?.pages?.[0] || defaultRoute;
  return (RoutingFormsRoutingConfig as unknown as Record<string, Component>)[routeKey];
};

export default function LayoutHandler(props: { [key: string]: unknown }) {
  const methods = useForm();
  const router = useRouter();
  const pageKey = router?.query?.pages?.[0] || "forms";
  const PageComponent = getComponent(pageKey).default;
  return (
    <FormProvider {...methods}>
      <PageComponent {...props} />
    </FormProvider>
  );
}

LayoutHandler.getLayout = (page: React.ReactElement, router: NextRouter) => {
  const component = getComponent(router).default;
  if (component && "getLayout" in component) {
    return component.getLayout?.(page, router);
  } else {
    return page;
  }
};

export async function getServerSideProps(
  context: GetServerSidePropsContext,
  ...rest: GetServerSidePropsRestArgs
) {
  const component = getComponent(context.params?.pages?.[0] || "");
  return component.getServerSideProps?.(context, ...rest) || { props: {} };
}
