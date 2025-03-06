"use client";

import type { GetServerSidePropsContext, GetServerSideProps } from "next";
import type { ReactElement, ReactNode, ComponentType } from "react";
import { FormProvider, useForm } from "react-hook-form";

import { useParamsWithFallback } from "@calcom/lib/hooks/useParamsWithFallback";

import RoutingFormsRoutingConfig from "../app-routing.config";

const DEFAULT_ROUTE = "forms";

type ComponentWithLayout = ComponentType & {
  getLayout?: (page: ReactElement) => ReactNode;
};

type Component = {
  default: ComponentWithLayout;
  getServerSideProps?: (
    context: GetServerSidePropsContext,
    ...rest: Parameters<GetServerSideProps>
  ) => ReturnType<GetServerSideProps>;
};

const getComponent = (route: string): Component => {
  return (RoutingFormsRoutingConfig as unknown as Record<string, Component>)[route];
};

export default function LayoutHandler(props: { [key: string]: unknown }) {
  const params = useParamsWithFallback();
  const methods = useForm();
  const pageKey = Array.isArray(params.pages)
    ? params.pages[0]
    : params.pages?.split("/")[0] ?? DEFAULT_ROUTE;
  const PageComponent = getComponent(pageKey).default;
  return (
    <FormProvider {...methods}>
      <PageComponent {...props} />
    </FormProvider>
  );
}
