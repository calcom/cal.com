import { setUser as SentrySetUser } from "@sentry/nextjs";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import React from "react";

import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import Shell from "@calcom/features/shell/Shell";

import { buildLegacyRequest } from "@lib/buildLegacyCtx";

const Layout = async ({ children }: { children: React.ReactNode }) => {
  const session = await getServerSession({ req: buildLegacyRequest(await headers(), await cookies()) });

  if (!session?.user?.id) {
    redirect("/auth/login");
  }

  SentrySetUser({ id: session.user.id });

  return (
    <Shell withoutSeo={true} withoutMain={true}>
      {children}
    </Shell>
  );
};

export default Layout;
