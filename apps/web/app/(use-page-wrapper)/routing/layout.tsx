import type { ReactNode } from "react";
import Shell from "~/shell/Shell";
import FormProvider from "../apps/routing-forms/[...pages]/FormProvider";

export default async function Layout({ children }: { children: ReactNode }) {
  return (
    <Shell withoutMain={true}>
      <FormProvider>{children}</FormProvider>
    </Shell>
  );
}
