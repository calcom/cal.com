import type { ReactNode } from "react";

import FormProvider from "./FormProvider";
import { RoutingFormAuthGuard } from "./RoutingFormAuthGuard";

interface LayoutProps {
  children: ReactNode;
  params: { pages: string[] };
}

export default async function Layout({ children, params }: LayoutProps) {
  const isPublic = params.pages?.[0] === "routing-link";
  if (isPublic) {
    return <FormProvider>{children}</FormProvider>;
  }

  return (
    <RoutingFormAuthGuard>
      <FormProvider>{children}</FormProvider>
    </RoutingFormAuthGuard>
  );
}
