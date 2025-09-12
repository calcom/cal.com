import type { ReactNode } from "react";

import FormProvider from "./FormProvider";
import { RoutingFormAuthGuard } from "./RoutingFormsShell";

export default async function Layout({ children }: { children: ReactNode }) {
  return (
    <RoutingFormAuthGuard>
      <FormProvider>{children}</FormProvider>
    </RoutingFormAuthGuard>
  );
}
