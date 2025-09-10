import type { ReactNode } from "react";

import FormProvider from "./FormProvider";
import { RoutingFormsShell } from "./RoutingFormsShell";

export default async function Layout({ children }: { children: ReactNode }) {
  return (
    <RoutingFormsShell>
      <FormProvider>{children}</FormProvider>
    </RoutingFormsShell>
  );
}
