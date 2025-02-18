"use client";

import type { GetServerSidePropsContext } from "next";
import React from "react";
import { FormProvider, useForm } from "react-hook-form";

import { useParamsWithFallback } from "@calcom/lib/hooks/useParamsWithFallback";
import type { AppPrisma, AppSsrInit, AppUser } from "@calcom/types/AppGetServerSideProps";

import type { AppProps } from "@lib/app-providers";

import RoutingFormsRoutingConfig from "../app-routing.config";

const DEFAULT_ROUTE = "forms";

type GetServerSidePropsRestArgs = [AppPrisma, AppUser, AppSsrInit];
type Component = {
  default: React.ComponentType & Pick<AppProps["Component"], "getLayout">;
  getServerSideProps?: (context: GetServerSidePropsContext, ...rest: GetServerSidePropsRestArgs) => void;
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
