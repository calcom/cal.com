import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import Shell from "@calcom/features/shell/Shell";

import FormProvider from "../[...pages]/FormProvider";

export default async function Layout({ children }: { children: ReactNode }) {
  const req = {
    headers: (await headers()) as any,
    cookies: (await cookies()) as any,
  } as any;
  const session = await getServerSession({ req: { headers: req.headers, cookies: req.cookies } as any });

  if (!session?.user?.id) {
    redirect("/auth/login");
  }
  return (
    <Shell withoutMain={true}>
      <FormProvider>{children}</FormProvider>
    </Shell>
  );
}
