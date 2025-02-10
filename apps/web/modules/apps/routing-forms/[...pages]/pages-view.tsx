"use client";

import LayoutHandler from "@calcom/app-store/routing-forms/pages/layout-handler/[...appPages]";
import { useParamsWithFallback } from "@calcom/lib/hooks/useParamsWithFallback";
import type { inferSSRProps } from "@calcom/types/inferSSRProps";

import type { getServerSideProps } from "@lib/apps/routing-forms/[...pages]/getServerSideProps";

export type PageProps = inferSSRProps<typeof getServerSideProps>;

function AppPage(props: PageProps) {
  const params = useParamsWithFallback();
  const pages = Array.isArray(params.pages) ? params.pages : params.pages?.split("/") ?? [];

  const componentProps = {
    ...props,
    pages: pages.slice(1),
  };
  return <LayoutHandler {...componentProps} />;
}

export default AppPage;
