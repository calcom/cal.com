import type { ReactNode } from "react";

import FormProvider from "./FormProvider";

export default async function Layout({ children }: { children: ReactNode }) {
  return <FormProvider>{children}</FormProvider>;
}
