import type { ReactNode } from "react";

import Shell from "@calcom/features/shell/Shell";

import FormProvider from "../[...pages]/FormProvider";

export default async function Layout({ children }: { children: ReactNode }) {
  return (
    <Shell withoutMain={true}>
      <FormProvider>{children}</FormProvider>
    </Shell>
  );
}
