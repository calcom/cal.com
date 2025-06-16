import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import Shell from "@calcom/features/shell/Shell";

import { buildLegacyRequest } from "@lib/buildLegacyCtx";

import FormProvider from "../[...pages]/FormProvider";

export default async function Layout({ children }: { children: ReactNode }) {
  const session = await getServerSession({ req: buildLegacyRequest(await headers(), await cookies()) });

  if (!session?.user?.id) {
    redirect("/auth/login");
  }
  return (
    <Shell withoutMain={true}>
      <FormProvider>{children}</FormProvider>
    </Shell>
  );
}
