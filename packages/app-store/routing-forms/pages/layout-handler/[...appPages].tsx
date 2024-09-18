"use client";

import React from "react";
import { FormProvider, useForm } from "react-hook-form";

import { useParamsWithFallback } from "@calcom/lib/hooks/useParamsWithFallback";

import { getComponent } from "./utils";

const DEFAULT_ROUTE = "forms";

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

LayoutHandler.getLayout = (page: React.ReactElement) => {
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const params = useParamsWithFallback();
  const pageKey = Array.isArray(params.pages)
    ? params.pages[0]
    : params.pages?.split("/")[0] ?? DEFAULT_ROUTE;

  const component = getComponent(pageKey).default;
  if (component && "getLayout" in component) {
    return component.getLayout?.(page);
  } else {
    return page;
  }
};
